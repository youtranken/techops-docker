/**
 * Lifecycle service — complete và cancel công việc.
 *
 * Exports:
 *  - complete : Assignee báo cáo hoàn thành
 *  - cancel   : Creator/Boss/Admin hủy công việc
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

  if (!data.reportContent?.trim()) {
    throw new WorkflowError('REPORT_REQUIRED', 'Nội dung báo cáo không được để trống');
  }

  if (data.files && data.files.length > 3) {
    throw new WorkflowError('FILE_LIMIT_EXCEEDED', 'Tối đa 3 file đính kèm');
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  for (const f of data.files ?? []) {
    if (f.fileSize > MAX_FILE_SIZE) {
      throw new WorkflowError('FILE_LIMIT_EXCEEDED', `File ${f.fileName} vượt quá 10MB`);
    }
    // S2: validate filePath — reject path traversal / absolute paths / URLs
    if (
      !f.filePath ||
      /\.\./.test(f.filePath) ||
      /^[/\\]/.test(f.filePath) ||
      /^[a-zA-Z]:/.test(f.filePath) ||
      /:\/\//.test(f.filePath)
    ) {
      throw new WorkflowError('INVALID_FILE_PATH', `Đường dẫn file không hợp lệ: ${f.fileName}`);
    }
  }

  // nextStatus được resolve sau transaction (cần biết allDone trước)
  let resolvedNextStatus: TaskStatus | null = null;

  // Serializable isolation: ngăn race condition khi 2 assignee cùng submit lúc cuối.
  // Nếu T1 và T2 cùng chạy: một cái sẽ retry sau khi cái kia commit,
  // thấy đầy đủ các assignee COMPLETED và trigger status transition đúng.
  await prisma.$transaction(async (tx) => {
    // Complete = tăng MAJOR version, reset minor về 0.
    //  - Lần đầu: V1.0
    //  - Sau Boss reject (REVISION_REQUIRED) → assignee submit lại: V2.0, V3.0...
    //  - Báo cáo bổ sung (V1.1, V1.2...) đi qua endpoint /api/tasks/[id]/reports (supplement),
    //    KHÔNG qua complete service này.
    const lastReport = await tx.assigneeReport.findFirst({
      where: { assigneeId: assignee.id },
      orderBy: [{ version: 'desc' }, { minorVersion: 'desc' }],
    });
    const version = (lastReport?.version ?? 0) + 1;
    const minorVersion = 0;

    const report = await tx.assigneeReport.create({
      data: { assigneeId: assignee.id, content: data.reportContent, version, minorVersion },
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
    // G8: Điều kiện chuyển PENDING_REVIEW / COMPLETED:
    // 1. Tất cả active assignees đều COMPLETED (every)
    // 2. Có ≥1 báo cáo thực sự được nộp (chống path side-channel set status COMPLETED không qua complete())
    const reportsCount = await tx.assigneeReport.count({
      where: { assignee: { taskId } },
    });
    const allDone =
      activeAssignees.length > 0 &&
      activeAssignees.every((a) => a.status === 'COMPLETED') &&
      reportsCount > 0;

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
          details: { reportVersion: `${version}.${minorVersion}` } as never,
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
          details: { reportVersion: `${version}.${minorVersion}`, partial: true } as never,
        },
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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

  // APPROVAL mode: creator chỉ hủy được khi task đang ở PENDING_APPROVAL (Boss chưa duyệt plan)
  if (!isPrivileged && isCreator && task.workflowMode === 'NEED_APPROVAL') {
    if (task.status !== 'PENDING_APPROVAL') {
      throw new WorkflowError(
        'FORBIDDEN',
        'Trong quy trình phê duyệt, bạn chỉ có thể hủy khi task đang chờ Boss duyệt kế hoạch',
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // G13: lưu status trước khi cancel để Admin có thể restore về đúng trạng thái cũ
      // Optimistic lock: ngăn double-cancel concurrent
      await tx.task.update({
        where: { id: taskId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        data: { status: 'CANCELLED', statusBeforeCancel: task.status },
      });
      // Hủy task = phủ nhận TOÀN BỘ assignees, kể cả COMPLETED.
      // Không loại trừ COMPLETED vì task đã hủy thì kết quả không còn ý nghĩa.
      await tx.taskAssignee.updateMany({
        where: {
          taskId,
          status: { in: ['PENDING', 'IN_PROGRESS', 'REVISION_REQUIRED', 'COMPLETED'] },
        },
        data: { status: 'REJECTED', rejectedAt: new Date() },
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
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2025') throw new WorkflowError('INVALID_STATUS', 'Công việc đã được xử lý trước đó');
    throw err;
  }

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
