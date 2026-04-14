/**
 * Acknowledge service — Employee tiếp nhận công việc được giao.
 */

import { prisma } from '@/lib/prisma';
import {
  getTaskOrThrow,
  createNotification,
  formatTaskRef,
  WorkflowError,
  type SessionUser,
} from './_shared';

export async function acknowledge(taskId: string, currentUser: SessionUser): Promise<void> {
  const task = await getTaskOrThrow(taskId);

  // Chỉ cho phép acknowledge ở WAITING_ACKNOWLEDGE hoặc IN_PROGRESS.
  // IN_PROGRESS xảy ra khi task nhiều assignees: người đầu tiên ACK đã đổi task sang IN_PROGRESS,
  // nhưng những người còn lại vẫn đang PENDING và cần acknowledge.
  // Transfer cũng tạo PENDING assignee mới trong lúc task đang IN_PROGRESS.
  if (!['WAITING_ACKNOWLEDGE', 'IN_PROGRESS'].includes(task.status)) {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Chỉ có thể tiếp nhận khi công việc đang chờ tiếp nhận hoặc đang thực hiện',
    );
  }

  const assignee = task.assignees.find(
    (a) => a.userId === currentUser.id && a.status === 'PENDING',
  );
  if (!assignee) {
    throw new WorkflowError(
      'NOT_ASSIGNEE',
      'Bạn không phải người thực hiện hoặc đã tiếp nhận rồi',
    );
  }

  await prisma.$transaction(async (tx) => {
    // Cập nhật assignee này sang IN_PROGRESS
    await tx.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: 'IN_PROGRESS', acknowledgedAt: new Date() },
    });

    // Chỉ đổi task status sang IN_PROGRESS nếu task đang WAITING_ACKNOWLEDGE.
    // Nếu task đã IN_PROGRESS (người khác ACK trước) → giữ nguyên, assignee vẫn vào làm bình thường.
    if (task.status === 'WAITING_ACKNOWLEDGE') {
      await tx.task.update({
        where: { id: taskId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'ACKNOWLEDGED',
        oldStatus: task.status,
        newStatus: 'IN_PROGRESS',
      },
    });
  });

  // Notify creator (nếu người tiếp nhận không phải creator)
  if (task.creatorId !== currentUser.id) {
    const ref = formatTaskRef(task.taskCode, task.title);
    const empName = task.assignees.find((a) => a.userId === currentUser.id)?.user.displayName ?? 'Nhân viên';
    await createNotification(
      task.creatorId,
      taskId,
      'TASK_ASSIGNED',
      `Đã tiếp nhận: ${ref}`,
      `${empName} đã tiếp nhận công việc`,
    );
}
}
