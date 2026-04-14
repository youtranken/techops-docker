import { prisma } from '@/lib/prisma';
import type { HelpdeskTicket } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse date an toàn */
export function safeDate(value: string | null | undefined, fallback: Date): Date;
export function safeDate(value: string | null | undefined, fallback: undefined): Date | undefined;
export function safeDate(value: string | null | undefined, fallback: Date | undefined = new Date()): Date | undefined {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

/** Fallback hdId khi Code bị rỗng */
export function extractHdId(tieuDe: string, timeStamp?: string): string {
  const slug = tieuDe.replace(/\s+/g, '-').substring(0, 20).replace(/[^a-zA-Z0-9-]/g, '');
  const suffix = timeStamp ? new Date(timeStamp).getTime().toString(36) : Date.now().toString(36);
  return `HD-${slug}-${suffix}`.substring(0, 50);
}

// ─── Service ─────────────────────────────────────────────────────────────────

class TicketTaskCreatorService {
  /** Tạo Task trực tiếp khi đã biết IT Support */
  async createTask(ticket: HelpdeskTicket, hdId: string, assigneeId: string): Promise<void> {
    const [priority, taskType, creator] = await Promise.all([
      prisma.priority.findFirst({ where: { name: ticket.uuTien } })
        .then((p) => p ?? prisma.priority.findFirst({ where: { isDefault: true } })),
      prisma.taskType.findFirst({ where: { name: ticket.loaiYeuCau } })
        .then((t) => t ?? prisma.taskType.findFirst({})),
      prisma.user.findFirst({
        where: { role: { name: { in: ['ADMIN', 'BOSS'] } }, isActive: true },
      }),
    ]);

    if (!priority || !taskType || !creator) {
      throw new Error('Thiếu dữ liệu: priority, taskType hoặc admin user không tồn tại');
    }

    const scheduleStart = safeDate(ticket.ngayTao, new Date());
    const completedAt = safeDate(ticket.timeStamp, undefined) ?? scheduleStart;
    const scheduleEnd = completedAt;

    await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: ticket.tieuDe,
          content: ticket.dienGiai,
          priorityId: priority.id,
          typeId: taskType.id,
          status: 'COMPLETED',
          workflowMode: 'IMMEDIATE',
          scheduleStart,
          scheduleEnd,
          completedAt,
          creatorId: creator.id,
          hdId,
          hdCode: ticket.code ? `API-${ticket.code}` : undefined,
          hdNhanVien: ticket.nhanVien,
          hdPhongBan: ticket.phongBan,
          hdNguonNhap: 'helpdesk',
        },
      });

      await tx.taskAssignee.create({
        data: {
          taskId: task.id,
          userId: assigneeId,
          status: 'COMPLETED',
          acknowledgedAt: scheduleStart,
          completedAt,
        },
      });

      await tx.taskAuditLog.create({
        data: {
          taskId: task.id,
          action: 'TASK_CREATED',
          performedById: creator.id,
          newStatus: 'COMPLETED',
          details: { source: 'helpdesk', hdId, itSupport: ticket.itSupport },
        },
      });
    });
  }

  /** Upsert vào HelpdeskPendingTask. status='PUSHED' khi đã tạo Task tự động. */
  async createPendingTask(ticket: HelpdeskTicket, hdId: string, forceStatus?: string): Promise<void> {
    const ngayHoanThanh = safeDate(ticket.timeStamp, undefined);
    const payload = {
      tieuDe: ticket.tieuDe || '(Khong co tieu de)',
      dienGiai: ticket.dienGiai || '',
      uuTien: ticket.uuTien || 'Binh thuong',
      loaiYeuCau: ticket.loaiYeuCau || 'Khac',
      nhanVien: ticket.nhanVien || '',
      phongBan: ticket.phongBan || '',
      thoiGian: safeDate(ticket.ngayTao, new Date()),
      trangThai: ticket.trangThai || 'Pending',
      itSupport: ticket.itSupport ?? undefined,
      ngayHoanThanh,
    };
    await prisma.helpdeskPendingTask.upsert({
      where: { hdId },
      create: { hdId, ...payload, status: forceStatus ?? 'UNASSIGNED' },
      update: { ...payload, ...(forceStatus ? { status: forceStatus } : {}) },
    });
  }

  /**
   * Tạo Task từ một HelpdeskPendingTask record.
   * Dùng khi push thủ công từ trang Helpdesk.
   * PUBLIC — được gọi từ push-to-tasks/route.ts.
   */
  async createTaskFromPending(
    pending: {
      hdId: string;
      tieuDe: string;
      dienGiai: string;
      uuTien: string;
      loaiYeuCau: string;
      nhanVien: string;
      phongBan: string;
      thoiGian: Date;
      itSupport: string | null;
      ngayHoanThanh: Date | null;
    },
    assigneeId: string,
  ): Promise<void> {
    const [priority, taskType, creator] = await Promise.all([
      prisma.priority.findFirst({ where: { name: pending.uuTien } })
        .then((p) => p ?? prisma.priority.findFirst({ where: { isDefault: true } })),
      prisma.taskType.findFirst({ where: { name: pending.loaiYeuCau } })
        .then((t) => t ?? prisma.taskType.findFirst({})),
      prisma.user.findFirst({
        where: { role: { name: { in: ['ADMIN', 'BOSS'] } }, isActive: true },
      }),
    ]);

    if (!priority || !taskType || !creator) {
      throw new Error('Thieu du lieu: priority, taskType hoac admin user khong ton tai');
    }

    const scheduleStart = pending.thoiGian;
    const scheduleEnd = pending.ngayHoanThanh
      ?? new Date(scheduleStart.getTime() + 7 * 86_400_000);

    const completedAt = pending.ngayHoanThanh ?? new Date();
    const hdCode = `API-${pending.hdId}`;

    await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: pending.tieuDe || '(Khong co tieu de)',
          content: pending.dienGiai || '',
          priorityId: priority.id,
          typeId: taskType.id,
          status: 'COMPLETED',
          workflowMode: 'IMMEDIATE',
          scheduleStart,
          scheduleEnd,
          completedAt,
          creatorId: creator.id,
          hdId: pending.hdId,
          hdCode,
          hdNhanVien: pending.nhanVien,
          hdPhongBan: pending.phongBan,
          hdNguonNhap: 'helpdesk',
        },
      });

      await tx.taskAssignee.create({
        data: {
          taskId: task.id,
          userId: assigneeId,
          status: 'COMPLETED',
          acknowledgedAt: scheduleStart,
          completedAt,
        },
      });

      await tx.taskAuditLog.create({
        data: {
          taskId: task.id,
          action: 'TASK_CREATED',
          performedById: creator.id,
          newStatus: 'COMPLETED',
          details: { source: 'helpdesk', hdId: pending.hdId, hdCode, itSupport: pending.itSupport },
        },
      });
    });
  }
}

export const ticketTaskCreatorService = new TicketTaskCreatorService();
