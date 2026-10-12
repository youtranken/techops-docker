import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * V2 — theo dõi task cho Boss/Admin:
 *  - ★ Quan trọng: cột Task.isImportant, dùng chung giữa các Boss/Admin. Nhân viên không thấy, không đánh được.
 *  - "Hoàn thành – chưa xem": riêng từng Boss/Admin (bảng TaskCompletionView).
 *    Chưa xem = status COMPLETED và KHÔNG có dòng view của user với seenAt >= completedAt
 *    → task hoàn thành lại (sau khi làm lại) tự hiện "chưa xem" lần nữa.
 *    Chỉ tính task hoàn thành sau khi tài khoản Boss/Admin được tạo,
 *    và bỏ qua task tạo sẵn ở trạng thái Hoàn thành (Helpdesk sync).
 */

interface SessionUser {
  id: string;
  role: { name: string };
}

export function isTrackingRole(roleName: string): boolean {
  return roleName === 'BOSS' || roleName === 'ADMIN';
}

export const taskTrackingService = {
  async getUnseenTaskIds(user: SessionUser): Promise<string[]> {
    if (!isTrackingRole(user.role.name)) return [];
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT t."id"
      FROM "Task" t
      JOIN "User" u ON u."id" = ${user.id}
      WHERE t."status" = 'COMPLETED'
        -- Boss/Admin tạo sau thì không bị tính các task đã hoàn thành trước khi có tài khoản
        AND COALESCE(t."completedAt", t."updatedAt") >= u."createdAt"
        -- Bỏ qua task tạo sẵn ở trạng thái Hoàn thành (Helpdesk sync — việc bên khác, không qua TechOps)
        AND NOT EXISTS (
          SELECT 1 FROM "TaskAuditLog" a
          WHERE a."taskId" = t."id" AND a."action" = 'TASK_CREATED' AND a."newStatus" = 'COMPLETED'
        )
        AND NOT EXISTS (
          SELECT 1 FROM "TaskCompletionView" v
          WHERE v."taskId" = t."id"
            AND v."userId" = ${user.id}
            AND v."seenAt" >= COALESCE(t."completedAt", t."updatedAt")
        )`;
    return rows.map((r) => r.id);
  },

  async setImportant(taskId: string, isImportant: boolean, user: SessionUser): Promise<void> {
    if (!isTrackingRole(user.role.name)) throw new Error('PERMISSION_DENIED');
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) throw new Error('TASK_NOT_FOUND');
    await prisma.task.update({ where: { id: taskId }, data: { isImportant } });
  },

  /** Boss/Admin mở task (chi tiết / xem nhanh) → ghi "đã xem" nếu task đang Hoàn thành. */
  async markSeen(taskId: string, user: SessionUser): Promise<void> {
    if (!isTrackingRole(user.role.name)) return;
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true } });
    if (task?.status !== 'COMPLETED') return;
    await upsertView(taskId, user.id);
  },

  async markAllSeen(user: SessionUser): Promise<number> {
    const ids = await this.getUnseenTaskIds(user);
    if (ids.length === 0) return 0;
    await prisma.$transaction(ids.map((id) => upsertView(id, user.id)));
    return ids.length;
  },

  async getCounters(user: SessionUser): Promise<{ important: number; unseen: number }> {
    if (!isTrackingRole(user.role.name)) return { important: 0, unseen: 0 };
    const unseenIds = await this.getUnseenTaskIds(user);
    const important = await prisma.task.count({
      where: { isImportant: true, ...activeOrUnseen(unseenIds) },
    });
    return { important, unseen: unseenIds.length };
  },
};

/** Điều kiện "Chưa hoàn thành" của Boss/Admin: chưa kết thúc, hoặc đã hoàn thành nhưng chưa xem. */
export function activeOrUnseen(unseenIds: string[]): Prisma.TaskWhereInput {
  return {
    OR: [
      { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      { id: { in: unseenIds } },
    ],
  };
}

function upsertView(taskId: string, userId: string) {
  const now = new Date();
  return prisma.taskCompletionView.upsert({
    where: { taskId_userId: { taskId, userId } },
    create: { taskId, userId, seenAt: now },
    update: { seenAt: now },
  });
}
