/**
 * Approval service — Boss/Admin duyệt hoặc từ chối kế hoạch và kết quả.
 *
 * Exports:
 *  - approvePlan   : Boss duyệt → WAITING_ACKNOWLEDGE, notify assignees
 *  - rejectPlan    : Boss từ chối kế hoạch → CANCELLED
 *  - approveReview : Boss duyệt kết quả → COMPLETED
 *  - rejectReview  : Boss yêu cầu làm lại → IN_PROGRESS (REVISION_REQUIRED)
 */

import { prisma } from '@/lib/prisma';
import {
  getTaskOrThrow,
  createNotification,
  formatTaskRef,
  WorkflowError,
  type SessionUser,
  type RejectData,
  type RejectReviewData,
} from './_shared';

// ── Approve Plan ──────────────────────────────────────────────────────────────

export async function approvePlan(taskId: string, currentUser: SessionUser): Promise<void> {
  if (!['BOSS', 'ADMIN'].includes(currentUser.role.name)) {
    throw new WorkflowError('FORBIDDEN', 'Chỉ Boss/Admin mới có thể duyệt kế hoạch');
  }

  const task = await getTaskOrThrow(taskId);

  if (task.status !== 'PENDING_APPROVAL') {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Chỉ có thể duyệt kế hoạch khi trạng thái là Chờ duyệt',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: 'WAITING_ACKNOWLEDGE' },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'PLAN_APPROVED',
        oldStatus: 'PENDING_APPROVAL',
        newStatus: 'WAITING_ACKNOWLEDGE',
      },
    });
  });

  const ref = formatTaskRef(task.taskCode, task.title);
  const bossName = task.creator.displayName;
  for (const assignee of task.assignees) {
    await createNotification(
      assignee.userId,
      taskId,
      'TASK_APPROVED',
      `Công việc được duyệt: ${ref}`,
      `${bossName} đã duyệt công việc — đang chờ bạn tiếp nhận`,
    );
  }
}

// ── Reject Plan ───────────────────────────────────────────────────────────────

export async function rejectPlan(
  taskId: string,
  data: RejectData,
  currentUser: SessionUser,
): Promise<void> {
  if (!['BOSS', 'ADMIN'].includes(currentUser.role.name)) {
    throw new WorkflowError('FORBIDDEN', 'Chỉ Boss/Admin mới có thể từ chối kế hoạch');
  }

  const task = await getTaskOrThrow(taskId);

  if (task.status !== 'PENDING_APPROVAL') {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Chỉ có thể từ chối kế hoạch khi trạng thái là Chờ duyệt',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: 'CANCELLED' },
    });
    await tx.taskAssignee.updateMany({
      where: { taskId },
      data: { status: 'REJECTED', rejectedAt: new Date(), transferNotes: data.reason ?? null },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'PLAN_REJECTED',
        oldStatus: 'PENDING_APPROVAL',
        newStatus: 'CANCELLED',
        details: data.reason ? { reason: data.reason } as never : undefined,
      },
    });
  });

  const ref = formatTaskRef(task.taskCode, task.title);
  // Notify creator
  await createNotification(
    task.creatorId,
    taskId,
    'TASK_REJECTED',
    `Kế hoạch bị từ chối: ${ref}`,
    data.reason ? `Lý do: ${data.reason}` : `Kế hoạch công việc của bạn đã bị từ chối`,
  );
  // Notify assignees (nếu khác creator)
  for (const assignee of task.assignees) {
    if (assignee.userId !== task.creatorId) {
      await createNotification(
        assignee.userId,
        taskId,
        'TASK_REJECTED',
        `Kế hoạch bị từ chối: ${ref}`,
        data.reason ? `Lý do: ${data.reason}` : `Kế hoạch đã bị từ chối`,
      );
    }
  }
}

// ── Approve Review ────────────────────────────────────────────────────────────

export async function approveReview(taskId: string, currentUser: SessionUser): Promise<void> {
  if (!['BOSS', 'ADMIN'].includes(currentUser.role.name)) {
    throw new WorkflowError('FORBIDDEN', 'Chỉ Boss/Admin mới có thể duyệt kết quả');
  }

  const task = await getTaskOrThrow(taskId);

  if (task.status !== 'PENDING_REVIEW') {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Chỉ có thể duyệt kết quả khi trạng thái là Chờ duyệt kết quả',
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: now },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'REVIEW_APPROVED',
        oldStatus: 'PENDING_REVIEW',
        newStatus: 'COMPLETED',
      },
    });
  });

  const ref = formatTaskRef(task.taskCode, task.title);
  const approverName = await prisma.user.findUnique({ where: { id: currentUser.id }, select: { displayName: true } }).then((u) => u?.displayName ?? 'Boss');
  for (const assignee of task.assignees) {
    await createNotification(
      assignee.userId,
      taskId,
      'TASK_COMPLETED',
      `Công việc đã được duyệt hoàn thành: ${ref}`,
      `${approverName} đã duyệt kết quả — công việc hoàn thành`,
    );
  }
}

// ── Reject Review ─────────────────────────────────────────────────────────────

export async function rejectReview(
  taskId: string,
  data: RejectReviewData,
  currentUser: SessionUser,
): Promise<void> {
  if (!['BOSS', 'ADMIN'].includes(currentUser.role.name)) {
    throw new WorkflowError('FORBIDDEN', 'Chỉ Boss/Admin mới có thể từ chối kết quả');
  }

  const task = await getTaskOrThrow(taskId);

  if (task.status !== 'PENDING_REVIEW') {
    throw new WorkflowError(
      'INVALID_STATUS',
      'Chỉ có thể từ chối kết quả khi đang ở Chờ duyệt kết quả',
    );
  }

  const allTargetIds = new Set<string>();
  const reasonByAssigneeId = new Map<string, string | undefined>();

  for (const entry of data) {
    const targets = entry.assigneeId
      ? task.assignees.filter((a) => a.id === entry.assigneeId && a.status === 'COMPLETED')
      : task.assignees.filter((a) => a.status === 'COMPLETED');
    for (const a of targets) {
      allTargetIds.add(a.id);
      reasonByAssigneeId.set(a.id, entry.reason);
    }
  }

  if (allTargetIds.size === 0) {
    throw new WorkflowError('NO_TARGET', 'Không tìm thấy assignee hợp lệ để yêu cầu làm lại');
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.updateMany({
      where: { id: { in: Array.from(allTargetIds) } },
      data: { status: 'REVISION_REQUIRED' },
    });
    await tx.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'REVIEW_REJECTED',
        oldStatus: 'PENDING_REVIEW',
        newStatus: 'IN_PROGRESS',
        details: { entries: data } as never,
      },
    });
  });

  const ref = formatTaskRef(task.taskCode, task.title);
  const bossName = task.creator.displayName;
  for (const a of task.assignees.filter((a) => allTargetIds.has(a.id))) {
    const reason = reasonByAssigneeId.get(a.id);
    await createNotification(
      a.userId, taskId, 'REVISION_REQUIRED',
      `Cần làm lại: ${ref}`,
      reason ? `${bossName} yêu cầu: ${reason}` : `${bossName} yêu cầu bạn làm lại công việc`,
    );
  }
}
