/**
 * Lifecycle service — complete và cancel công việc.
 *
 * Exports:
 *  - complete : Assignee báo cáo hoàn thành
 *  - cancel   : Creator/Boss/Admin hủy công việc
 */

import { prisma } from '@/lib/prisma';
import type { TaskStatus } from '@prisma/client';
import {
  getTaskOrThrow,
  createNotification,
  notifyBosses,
  formatTaskRef,
  WorkflowError,
  type SessionUser,
  type CompleteData,
  type RejectData,
} from './_shared';

// ── Complete ──────────────────────────────────────────────────────────────────

export async function complete(
  taskId: string,
  data: CompleteData,
  currentUser: SessionUser,
): Promise<void> {
  const task = await getTaskOrThrow(taskId);

  if (!['IN_PROGRESS', 'REVISION_REQUIRED'].includes(task.status)) {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Chỉ có thể hoàn thành khi đang thực hiện hoặc yêu cầu sửa',
    );
  }

  const assignee = task.assignees.find(
    (a) => a.userId === currentUser.id && ['IN_PROGRESS', 'REVISION_REQUIRED'].includes(a.status),
  );
  if (!assignee) {
    throw new WorkflowError(
      'NOT_ASSIGNEE',
      'Bạn không phải người thực hiện hoặc không ở trạng thái đang làm',
    );
  }

  if (data.reportContent.length < 10) {
    throw new WorkflowError('REPORT_TOO_SHORT', 'Báo cáo phải có ít nhất 10 ký tự');
  }

  if (data.files && data.files.length > 3) {
    throw new WorkflowError('FILE_LIMIT_EXCEEDED', 'Tối đa 3 file đính kèm');
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  for (const f of data.files ?? []) {
    if (f.fileSize > MAX_FILE_SIZE) {
      throw new WorkflowError('FILE_LIMIT_EXCEEDED', `File ${f.fileName} vượt quá 10MB`);
    }
  }

  // nextStatus được resolve sau transaction (cần biết allDone trước)
  let resolvedNextStatus: TaskStatus | null = null;

  await prisma.$transaction(async (tx) => {
    // Tạo báo cáo (version tăng dần, tránh race condition qua @@unique)
    const lastReport = await tx.assigneeReport.findFirst({
      where: { assigneeId: assignee.id },
      orderBy: { version: 'desc' },
    });
    const version = (lastReport?.version ?? 0) + 1;

    const report = await tx.assigneeReport.create({
      data: { assigneeId: assignee.id, content: data.reportContent, version },
    });

    if (data.files && data.files.length > 0) {
      await tx.reportAttachment.createMany({
        data: data.files.map((f) => ({
          reportId: report.id,
          fileName: f.fileName,
          filePath: f.filePath,
          fileSize: f.fileSize,
        })),
      });
    }

    await tx.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    // Kiểm tra tất cả assignees đã COMPLETED chưa.
    // Task chỉ được đóng khi TẤT CẢ người thực hiện đã hoàn thành.
    const allAssignees = await tx.taskAssignee.findMany({
      where: { taskId },
      select: { id: true, status: true },
    });
    // Chỉ xét những assignee đang ACTIVE (không tính TRANSFERRED / REJECTED / CANCELLED).
    // Nếu tất cả active assignees đều COMPLETED → task có thể đóng.
    const activeAssignees = allAssignees.filter(
      (a) => !['TRANSFERRED', 'REJECTED', 'CANCELLED'].includes(a.status),
    );
    const allDone =
      activeAssignees.length > 0 && activeAssignees.every((a) => a.status === 'COMPLETED');

    if (allDone) {
      // REVISION_REQUIRED: luôn chuyển sang PENDING_REVIEW để Boss review lại.
      // IN_PROGRESS: tuỳ workflowMode.
      const nextStatus: TaskStatus =
        assignee.status === 'REVISION_REQUIRED' || task.workflowMode === 'NEED_APPROVAL'
          ? 'PENDING_REVIEW'
          : 'COMPLETED';
      resolvedNextStatus = nextStatus;

      await tx.task.update({
        where: { id: taskId },
        data: {
          status: nextStatus,
          ...(nextStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
      });

      // Tự động hủy gia hạn đang chờ khi task đóng
      await tx.extensionRequest.updateMany({
        where: { taskId, status: 'PENDING' },
        data: { status: 'REJECTED', responseNote: 'Tự động hủy khi hoàn thành', respondedAt: new Date() },
      });

      await tx.taskAuditLog.create({
        data: {
          taskId,
          performedById: currentUser.id,
          action: 'COMPLETED',
          oldStatus: task.status,
          newStatus: nextStatus,
          details: { reportVersion: version } as never,
        },
      });
    } else {
      // Còn assignee chưa xong — task giữ IN_PROGRESS, chỉ ghi audit partial
      await tx.taskAuditLog.create({
        data: {
          taskId,
          performedById: currentUser.id,
          action: 'COMPLETED',
          oldStatus: task.status,
          newStatus: task.status,
          details: { reportVersion: version, partial: true } as never,
        },
      });
    }
  });

  // Notify boss để review (chỉ khi tất cả xong và là NEED_APPROVAL mode)
  if (resolvedNextStatus === 'PENDING_REVIEW') {
    const ref = formatTaskRef(task.taskCode, task.title);
    const empName = task.assignees.find((a) => a.userId === currentUser.id)?.user.displayName ?? 'Nhân viên';
    await notifyBosses(
      taskId,
      'REVIEW_REQUIRED',
      `Cần duyệt kết quả: ${ref}`,
      `${empName} đã hoàn thành và đang chờ bạn duyệt`,
    );
}
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancel(
  taskId: string,
  data: RejectData,
  currentUser: SessionUser,
): Promise<void> {
  const task = await getTaskOrThrow(taskId);

  const isPrivileged = ['BOSS', 'ADMIN'].includes(currentUser.role.name);
  const isCreator    = task.creatorId === currentUser.id;
  if (!isPrivileged && !isCreator) {
    throw new WorkflowError('FORBIDDEN', 'Chỉ Boss/Admin/người tạo mới có thể hủy');
  }
  if (task.isForceMode && !isPrivileged) {
    throw new WorkflowError('FORBIDDEN', 'Không thể hủy khi Force Mode đang bật');
  }

  if (['COMPLETED', 'CANCELLED'].includes(task.status)) {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Không thể hủy công việc đã hoàn thành hoặc đã hủy',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
    });
    await tx.extensionRequest.updateMany({
      where: { taskId, status: 'PENDING' },
      data: { status: 'REJECTED', responseNote: 'Tự động hủy khi hủy công việc', respondedAt: new Date() },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'TASK_CANCELLED',
        oldStatus: task.status,
        newStatus: 'CANCELLED',
        details: data.reason ? { reason: data.reason } as never : undefined,
      },
    });
  });

  // Notify assignees (trừ người hủy)
  const ref = formatTaskRef(task.taskCode, task.title);
  const cancellerName = task.creator.displayName;
  for (const assignee of task.assignees) {
    if (assignee.userId !== currentUser.id) {
      await createNotification(
        assignee.userId,
        taskId,
        'TASK_REJECTED',
        `Công việc bị hủy: ${ref}`,
        data.reason ? `${cancellerName} hủy — lý do: ${data.reason}` : `${cancellerName} đã hủy công việc`,
      );
    }
  }
}
