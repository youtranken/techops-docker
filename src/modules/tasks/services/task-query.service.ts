import { prisma } from '@/lib/prisma';
import type { PaginatedResult } from '@/lib/types/pagination';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/types/pagination';
import type { TaskStatus, Prisma } from '@prisma/client';
import { taskDetailService } from './task-detail.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskSortField = 'createdAt' | 'scheduleEnd' | 'title' | 'status';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskListFilters {
  status?: TaskStatus;
  priorityId?: string;
  typeId?: string;
  assigneeId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  source?: 'helpdesk' | 'techops';
  sortField?: TaskSortField;
  sortOrder?: TaskSortOrder;
  /** Ẩn task đã kết thúc (COMPLETED, CANCELLED) — bỏ qua khi đã chọn `status` cụ thể */
  hideCompleted?: boolean;
}

export interface TaskListItem {
  id: string;
  taskCode: string | null;
  title: string;
  status: TaskStatus;
  workflowMode: string;
  isForceMode: boolean;
  allFailed: boolean;
  scheduleStart: Date;
  scheduleEnd: Date;
  createdAt: Date;
  priority: { id: string; name: string; color: string; level: number };
  type: { id: string; name: string; color: string; icon: string };
  creator: { id: string; displayName: string; username: string; profile: { avatarColor: string; avatarUrl: string | null } | null };
  assignees: {
    id: string;
    status: string;
    user: { id: string; displayName: string; username: string; profile: { avatarColor: string; avatarUrl: string | null } | null };
  }[];
  _count: { comments: number };
  extensions: { id: string; status: string; reason: string; requestedDate: Date; requester: { id: string; displayName: string } }[];
  hdNguonNhap: string | null;
  hdCode: string | null;
  hasMention?: boolean;
}

export interface TaskDetail extends TaskListItem {
  content: string;
  hdId: string | null;
  hdCode: string | null;
  hdNhanVien: string | null;
  hdPhongBan: string | null;
  completedAt: Date | null;
  attachments: {
    id: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    uploadedBy: string;
  }[];
  // Override assignees to include per-assignee reports
  assignees: {
    id: string;
    status: string;
    completedAt: Date | null;
    user: { id: string; displayName: string; username: string; profile: { avatarColor: string; avatarUrl: string | null } | null };
    reports: {
      id: string;
      content: string;
      version: number;
      submittedAt: Date;
      attachments: { id: string; fileName: string; filePath: string; fileSize: number }[];
    }[];
  }[];
  auditLogs: {
    id: string;
    action: string;
    oldStatus: string | null;
    newStatus: string | null;
    details: unknown;
    createdAt: Date;
    performedBy: { id: string; displayName: string; username: string; role: { name: string } };
  }[];
  extensions: {
    id: string;
    reason: string;
    requestedDate: Date;
    status: string;
    responseNote: string | null;
    requester: { id: string; displayName: string };
  }[];
}

export interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
}

// ─── Session user shape ───────────────────────────────────────────────────────

interface SessionUser {
  id: string;
  displayName: string;
  role: { name: string };
}

// ─── Shared include config ───────────────────────────────────────────────────

const taskInclude = {
  priority: { select: { id: true, name: true, color: true, level: true } },
  type: { select: { id: true, name: true, color: true, icon: true } },
  creator: { select: { id: true, displayName: true, username: true, profile: { select: { avatarColor: true, avatarUrl: true } } } },
  assignees: {
    select: {
      id: true,
      status: true,
      user: { select: { id: true, displayName: true, username: true, profile: { select: { avatarColor: true, avatarUrl: true } } } },
    },
  },
  _count: { select: { comments: true } },
  extensions: {
    select: { id: true, status: true, reason: true, requestedDate: true, requester: { select: { id: true, displayName: true } } },
    where: { status: 'PENDING' },
  },
} satisfies Prisma.TaskInclude;

// ─── Service ─────────────────────────────────────────────────────────────────

export const taskQueryService = {
  async list(
    filters: TaskListFilters,
    currentUser: SessionUser
  ): Promise<PaginatedResult<TaskListItem>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, filters.limit ?? DEFAULT_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const isPrivileged = ['ADMIN', 'BOSS'].includes(currentUser.role.name);

    // Row-level security (RLS)
    // - BOSS/ADMIN: thấy tất cả
    // - EMPLOYEE: thấy task mình tạo, hoặc là assignee
    //   EXCEPTION: nếu task đang PENDING_APPROVAL thì chỉ creator mới thấy (assignee chưa được thông báo)
    const rlsWhere: Prisma.TaskWhereInput = isPrivileged
      ? {}
      : {
          OR: [
            // Creator luôn thấy task của mình
            { creatorId: currentUser.id },
            // Assignee chỉ thấy task khi đã qua PENDING_APPROVAL
            {
              assignees: { some: { userId: currentUser.id } },
              status: { not: 'PENDING_APPROVAL' },
            },
          ],
        };

    // Filters
    const filterWhere: Prisma.TaskWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(!filters.status && filters.hideCompleted && { status: { notIn: ['COMPLETED', 'CANCELLED'] } }),
      ...(filters.priorityId && { priorityId: filters.priorityId }),
      ...(filters.typeId && { typeId: filters.typeId }),
      ...(filters.assigneeId && {
        assignees: { some: { userId: filters.assigneeId } },
      }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.dateFrom && { scheduleEnd: { gte: new Date(filters.dateFrom) } }),
      ...(filters.dateTo && { scheduleEnd: { lte: new Date(filters.dateTo) } }),
      ...(filters.source === 'helpdesk' && { hdNguonNhap: 'helpdesk' }),
      ...(filters.source === 'techops' && { OR: [{ hdNguonNhap: null }, { hdNguonNhap: { not: 'helpdesk' } }] }),
    };

    const where: Prisma.TaskWhereInput = { AND: [rlsWhere, filterWhere] };

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: { [filters.sortField ?? 'createdAt']: filters.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    // Detect mention: task có comment có nội dung chứa @displayName của current user
    const taskIds = data.map((t) => t.id);
    const mentionedTaskIds = taskIds.length > 0
      ? await prisma.comment.findMany({
          where: {
            taskId: { in: taskIds },
            content: { contains: `@${currentUser.displayName}`, mode: 'insensitive' },
            isDeleted: false,
          },
          select: { taskId: true },
          distinct: ['taskId'],
        }).then((rows: { taskId: string }[]) => new Set(rows.map((r) => r.taskId)))
      : new Set<string>();

    const dataWithMention = data.map((t) => ({
      ...t,
      hasMention: mentionedTaskIds.has(t.id),
    }));

    return {
      data: dataWithMention as unknown as TaskListItem[],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // Delegate to task-detail.service.ts
  getById: taskDetailService.getById.bind(taskDetailService),

  async getStats(currentUser: SessionUser): Promise<TaskStats> {
    const isPrivileged = ['ADMIN', 'BOSS'].includes(currentUser.role.name);

    const where: Prisma.TaskWhereInput = {
      ...(isPrivileged
        ? {}
        : {
            OR: [
              { creatorId: currentUser.id },
              { assignees: { some: { userId: currentUser.id } } },
            ],
          }),
    };

    const groups = await prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      byStatus[g.status] = g._count.status;
      total += g._count.status;
    }

    return { total, byStatus };
  },
};
