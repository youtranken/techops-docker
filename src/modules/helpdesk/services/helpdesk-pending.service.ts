import { prisma } from '@/lib/prisma';
import type { Task } from '@prisma/client';
import type { PendingFilters } from '../types';

interface SessionUser {
  id: string;
  role: { name: string };
}

class HelpdeskPendingService {
  async list(filters: PendingFilters) {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 50;
    const skip  = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [];

    if (filters.search) {
      andConditions.push({
        OR: [
          { tieuDe:   { contains: filters.search, mode: 'insensitive' } },
          { nhanVien: { contains: filters.search, mode: 'insensitive' } },
          { hdId:     { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.uuTien)    andConditions.push({ uuTien:    filters.uuTien });
    if (filters.trangThai) andConditions.push({ trangThai: filters.trangThai });

    if (filters.itSupport === '__none__') {
      andConditions.push({ itSupport: null });
    } else if (filters.itSupport) {
      andConditions.push({ itSupport: { contains: filters.itSupport, mode: 'insensitive' } });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      andConditions.push({ thoiGian: dateFilter });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [data, total] = await Promise.all([
      prisma.helpdeskPendingTask.findMany({
        where,
        orderBy: { thoiGian: 'desc' },  // giảm dần — mới nhất lên đầu
        skip,
        take: limit,
      }),
      prisma.helpdeskPendingTask.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** Lấy danh sách giá trị distinct để hiển thị trong filter dropdowns */
  async filterOptions() {
    const [uuTienRows, trangThaiRows, itSupportRows] = await Promise.all([
      prisma.helpdeskPendingTask.findMany({ select: { uuTien: true },    distinct: ['uuTien'] }),
      prisma.helpdeskPendingTask.findMany({ select: { trangThai: true }, distinct: ['trangThai'] }),
      prisma.helpdeskPendingTask.findMany({ select: { itSupport: true }, distinct: ['itSupport'] }),
    ]);
    return {
      uuTien:    uuTienRows.map((r) => r.uuTien).filter(Boolean),
      trangThai: trangThaiRows.map((r) => r.trangThai).filter(Boolean),
      itSupport: itSupportRows.map((r) => r.itSupport).filter(Boolean) as string[],
    };
  }

  async assign(id: string, assigneeId: string, currentUser: SessionUser): Promise<Task> {
    const pending = await prisma.helpdeskPendingTask.findUnique({ where: { id } });
    if (!pending) throw new Error('HELPDESK_PENDING_NOT_FOUND');

    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) throw new Error('USER_NOT_FOUND');

    const [priority, taskType] = await Promise.all([
      prisma.priority.findFirst({ where: { name: pending.uuTien } })
        .then((p) => p ?? prisma.priority.findFirst({ where: { isDefault: true } })),
      prisma.taskType.findFirst({ where: { name: pending.loaiYeuCau } })
        .then((t) => t ?? prisma.taskType.findFirst({})),
    ]);

    if (!priority || !taskType) throw new Error('MISSING_REQUIRED_DATA');

    const completedAt = pending.ngayHoanThanh ?? new Date();
    const hdCode      = `API-${pending.hdId}`;

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title:        pending.tieuDe,
          content:      pending.dienGiai,
          priorityId:   priority.id,
          typeId:       taskType.id,
          status:       'COMPLETED',
          workflowMode: 'IMMEDIATE',
          scheduleStart: pending.thoiGian,
          scheduleEnd:  completedAt,
          completedAt,
          creatorId:    currentUser.id,
          hdId:         pending.hdId,
          hdCode,
          hdNhanVien:   pending.nhanVien,
          hdPhongBan:   pending.phongBan,
          hdNguonNhap:  'helpdesk',
        },
      });

      await tx.taskAssignee.create({
        data: {
          taskId:         created.id,
          userId:         assigneeId,
          status:         'COMPLETED',
          acknowledgedAt: pending.thoiGian,
          completedAt,
        },
      });

      await tx.taskAuditLog.create({
        data: {
          taskId:        created.id,
          action:        'TASK_CREATED',
          performedById: currentUser.id,
          newStatus:     'COMPLETED',
          details:       { source: 'helpdesk', hdId: pending.hdId, hdCode },
        },
      });

      // Giữ nguyên pending, đánh dấu PUSHED để tham chiếu
      await tx.helpdeskPendingTask.update({
        where: { id: pending.id },
        data:  { status: 'PUSHED' },
      });

      return created;
    });

    return task;
  }

  async delete(id: string): Promise<void> {
    const pending = await prisma.helpdeskPendingTask.findUnique({ where: { id } });
    if (!pending) throw new Error('HELPDESK_PENDING_NOT_FOUND');
    await prisma.helpdeskPendingTask.delete({ where: { id } });
  }
}

export const helpdeskPendingService = new HelpdeskPendingService();
