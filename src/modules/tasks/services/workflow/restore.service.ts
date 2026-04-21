/**
 * Restore service — Admin khôi phục task đã CANCELLED.
 * G14: restore về statusBeforeCancel (option B), reset assignees về PENDING (option X).
 */

import { prisma } from '@/lib/prisma';
import {
  getTaskOrThrow,
  createNotification,
  formatTaskRef,
  WorkflowError,
  type SessionUser,
} from './_shared';

export async function restoreCancelled(taskId: string, currentUser: SessionUser): Promise<void> {
  if (currentUser.role.name !== 'ADMIN') {
    throw new WorkflowError('FORBIDDEN', 'Chỉ Admin mới có thể khôi phục công việc');
  }

  const task = await getTaskOrThrow(taskId);

  if (task.status !== 'CANCELLED') {
    throw new WorkflowError('INVALID_STATUS', 'Chỉ có thể khôi phục công việc đã bị hủy');
  }

  if (!task.statusBeforeCancel) {
    throw new WorkflowError(
      'CANNOT_RESTORE',
      'Không có dữ liệu trạng thái trước hủy — không thể khôi phục (task hủy trước khi tính năng này được thêm)',
    );
  }

  const targetStatus = task.statusBeforeCancel;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: targetStatus,
        statusBeforeCancel: null,
        completedAt: null,
      },
    });

    // Reset toàn bộ assignees về PENDING — coi như giao lại từ đầu (option X)
    await tx.taskAssignee.updateMany({
      where: { taskId },
      data: {
        status: 'PENDING',
        acknowledgedAt: null,
        completedAt: null,
        rejectedAt: null,
      },
    });

    await tx.task.update({ where: { id: taskId }, data: { allFailed: false } });

    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'STATUS_CHANGED',
        oldStatus: 'CANCELLED',
        newStatus: targetStatus,
        details: { restored: true, restoredBy: currentUser.id } as never,
      },
    });
  });

  // Notify creator + assignees
  const ref = formatTaskRef(task.taskCode, task.title);
  await createNotification(
    task.creatorId,
    taskId,
    'TASK_ASSIGNED',
    `Công việc đã được khôi phục: ${ref}`,
    'Admin đã khôi phục công việc đã hủy. Công việc trở lại trạng thái trước khi bị hủy.',
  );
  for (const a of task.assignees) {
    if (a.userId !== task.creatorId) {
      await createNotification(
        a.userId,
        taskId,
        'TASK_ASSIGNED',
        `Công việc được khôi phục: ${ref}`,
        'Công việc đã hủy được Admin khôi phục — vui lòng tiếp nhận lại.',
      );
    }
  }
}
