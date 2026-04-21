import { prisma } from '@/lib/prisma';
import type { TaskAction, TaskStatus, Prisma } from '@prisma/client';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { TaskLogEntry } from '../types';
// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogTaskInput {
  taskId?: string;
  action: TaskAction;
  performedById: string;
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  details?: Record<string, unknown>;
}

export interface TaskAuditLogFilters {
  taskTitle?: string;
  userId?: string;
  action?: TaskAction;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

interface SessionUser {
  id: string;
  role: { name: string };
}

// ─── Service ─────────────────────────────────────────────────────────────────

class TaskAuditLogService {
  async log(data: LogTaskInput): Promise<void> {
    await prisma.taskAuditLog.create({
      data: {
        taskId: data.taskId,
        action: data.action,
        performedById: data.performedById,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        details: data.details as Prisma.InputJsonValue,
      },
    });
  }

  async getByTask(
    taskId: string,
    currentUser: SessionUser,
  ): Promise<TaskLogEntry[]> {
    if (currentUser.role.name === 'EMPLOYEE') {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { creatorId: currentUser.id },
            { assignees: { some: { userId: currentUser.id } } },
          ],
        },
        select: { id: true },
      });
      if (!task) return [];
    }

    const rows = await prisma.taskAuditLog.findMany({
      where: { taskId },
      include: {
        performedBy: {
          select: {
            id: true, displayName: true, username: true,
            role: { select: { name: true } },
          },
        },
        task: { select: { id: true, taskCode: true, title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action,
      oldStatus: row.oldStatus ?? null,
      newStatus: row.newStatus ?? null,
      details: row.details as Record<string, unknown> | null,
      performedBy: row.performedBy,
      task: row.task,
    }));
  }

  async getAll(
    filters: TaskAuditLogFilters,
    currentUser: SessionUser,
  ): Promise<PaginatedResult<TaskLogEntry>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);
    const skip = (page - 1) * limit;

    const isPrivileged = ['ADMIN', 'BOSS'].includes(currentUser.role.name);

    const rlsWhere: Prisma.TaskAuditLogWhereInput = isPrivileged
      ? {}
      : {
          task: {
            OR: [
              { creatorId: currentUser.id },
              { assignees: { some: { userId: currentUser.id } } },
            ],
          },
        };

    const filterWhere: Prisma.TaskAuditLogWhereInput = {
      ...(filters.taskTitle && {
        task: { title: { contains: filters.taskTitle, mode: 'insensitive' } },
      }),
      ...(filters.userId && { performedById: filters.userId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom && { gte: filters.dateFrom }),
              ...(filters.dateTo && { lte: new Date(filters.dateTo.toISOString().slice(0, 10) + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    const where: Prisma.TaskAuditLogWhereInput = { AND: [rlsWhere, filterWhere] };

    const [rows, total] = await Promise.all([
      prisma.taskAuditLog.findMany({
        where,
        include: {
          performedBy: {
            select: {
              id: true,
              displayName: true,
              username: true,
              role: { select: { name: true } },
            },
          },
          task: { select: { id: true, taskCode: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.taskAuditLog.count({ where }),
    ]);

    const data: TaskLogEntry[] = rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      action: row.action,
      oldStatus: row.oldStatus ?? null,
      newStatus: row.newStatus ?? null,
      details: row.details as Record<string, unknown> | null,
      performedBy: row.performedBy,
      task: row.task,
    }));

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export const taskAuditLogService = new TaskAuditLogService();
