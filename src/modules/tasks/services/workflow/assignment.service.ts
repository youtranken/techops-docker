/**
 * Assignment service — transfer và reassign công việc.
 *
 * Exports:
 *  - transfer  : Assignee chuyển giao cho người khác
 *  - rejectTask: Assignee từ chối nhận (PENDING → REJECTED), phục hồi nguồn transfer nếu có
 *  - reassign  : Boss/Admin giao lại khi allFailed
 */

import { prisma } from '@/lib/prisma';
import {
  getTaskOrThrow,
  createNotification,
  checkAllFailed,
  formatTaskRef,
  WorkflowError,
  type SessionUser,
  type TransferData,
  type RejectData,
  type ReassignData,
} from './_shared';

// ── Transfer ──────────────────────────────────────────────────────────────────

export async function transfer(
  taskId: string,
  data: TransferData,
  currentUser: SessionUser,
): Promise<void> {
  const task = await getTaskOrThrow(taskId);

  if (task.status !== 'IN_PROGRESS') {
    throw new WorkflowError('INVALID_STATUS', 'Chỉ có thể chuyển giao khi đang thực hiện');
  }
  if (task.isForceMode) {
    throw new WorkflowError('FORCE_MODE', 'Không thể chuyển giao công việc Force Mode');
  }

  const assignee = task.assignees.find(
    (a) => a.userId === currentUser.id && a.status === 'IN_PROGRESS',
  );
  if (!assignee) {
    throw new WorkflowError('NOT_ASSIGNEE', 'Bạn không phải người đang thực hiện hoặc chưa tiếp nhận');
  }
  if (data.newAssigneeId === currentUser.id) {
    throw new WorkflowError('SAME_USER', 'Không thể chuyển giao cho chính mình');
  }

  const newUser = await prisma.user.findUnique({
    where: { id: data.newAssigneeId, isActive: true },
  });
  if (!newUser) {
    throw new WorkflowError('USER_NOT_FOUND', 'Người nhận chuyển giao không tồn tại');
  }

  // Cấm vòng lặp transfer: nếu người nhận đã từng transfer task này đi (TRANSFERRED) → từ chối
  const prevTransfer = task.assignees.find(
    (a) => a.userId === data.newAssigneeId && a.status === 'TRANSFERRED',
  );
  if (prevTransfer) {
    throw new WorkflowError(
      'TRANSFER_LOOP',
      'Không thể chuyển giao cho người đã từng chuyển giao task này (vòng lặp)',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: 'TRANSFERRED', transferNotes: data.notes ?? null },
    });

    // Upsert: nếu người nhận đã từng bị reject trước đó, cập nhật lại
    const existing = await tx.taskAssignee.findUnique({
      where: { taskId_userId: { taskId, userId: data.newAssigneeId } },
    });
    if (existing) {
      await tx.taskAssignee.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          transferredFrom: currentUser.id,
          transferNotes: data.notes ?? null,
          rejectedAt: null,
        },
      });
    } else {
      await tx.taskAssignee.create({
        data: {
          taskId,
          userId: data.newAssigneeId,
          status: 'PENDING',
          transferredFrom: currentUser.id,
          transferNotes: data.notes ?? null,
        },
      });
    }

    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'TRANSFERRED',
        oldStatus: task.status,
        newStatus: task.status,
        details: { transferTo: data.newAssigneeId, transferToName: newUser.displayName, notes: data.notes } as never,
      },
    });
  });

  const ref = formatTaskRef(task.taskCode, task.title);
  const fromName = assignee.user.displayName;
  await createNotification(
    data.newAssigneeId,
    taskId,
    'TRANSFER_RECEIVED',
    `Được chuyển giao: ${ref}`,
    `${fromName} đã chuyển giao công việc cho bạn`,
  );

  await checkAllFailed(taskId, task.creatorId);
}

// ── Reject Task ───────────────────────────────────────────────────────────────

export async function rejectTask(
  taskId: string,
  data: RejectData,
  currentUser: SessionUser,
): Promise<void> {
  const task = await getTaskOrThrow(taskId);

  // Cho phép reject ở cả WAITING_ACKNOWLEDGE (gốc) và IN_PROGRESS (sau transfer)
  if (!['WAITING_ACKNOWLEDGE', 'IN_PROGRESS'].includes(task.status)) {
    throw new WorkflowError('INVALID_STATUS', 'Chỉ có thể từ chối khi đang chờ tiếp nhận');
  }
  if (task.isForceMode) {
    throw new WorkflowError('FORCE_MODE', 'Không thể từ chối công việc Force Mode');
  }

  const assignee = task.assignees.find(
    (a) => a.userId === currentUser.id && a.status === 'PENDING',
  );
  if (!assignee) {
    throw new WorkflowError('NOT_ASSIGNEE', 'Bạn không phải người thực hiện hoặc đã xử lý rồi');
  }

  // Nếu được transfer từ người khác → phục hồi người gốc về IN_PROGRESS
  const transferSourceId = assignee.transferredFrom;

  await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.update({
      where: { id: assignee.id },
      data: { status: 'REJECTED', rejectedAt: new Date(), transferNotes: data.reason ?? null },
    });

    // Phục hồi người transfer gốc (S10: chỉ khi user vẫn còn active)
    if (transferSourceId) {
      const sourceAssignee = await tx.taskAssignee.findUnique({
        where: { taskId_userId: { taskId, userId: transferSourceId } },
      });
      const sourceUser = transferSourceId
        ? await tx.user.findUnique({ where: { id: transferSourceId }, select: { id: true, displayName: true, isActive: true } })
        : null;

      if (sourceAssignee && sourceAssignee.status === 'TRANSFERRED' && sourceUser?.isActive) {
        const restoredUser = sourceUser;
        await tx.taskAssignee.update({
          where: { id: sourceAssignee.id },
          data: { status: 'IN_PROGRESS', transferNotes: null },
        });
        await tx.taskAuditLog.create({
          data: {
            taskId,
            performedById: currentUser.id,
            action: 'TRANSFERRED',
            oldStatus: task.status,
            newStatus: task.status,
            details: {
              isRestore: true,
              rejectedByName: assignee.user.displayName,
              restoredTo: transferSourceId,
              restoredToName: restoredUser?.displayName ?? '',
            } as never,
          },
        });
      }
    }

    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'REJECTED',
        oldStatus: task.status,
        newStatus: task.status,
        details: data.reason ? { reason: data.reason } as never : undefined,
      },
    });
  });

  // Notify người gốc nếu bị trả lại (chỉ khi user vẫn active)
  if (transferSourceId) {
    const sourceActive = await prisma.user.findUnique({ where: { id: transferSourceId }, select: { isActive: true } });
    if (sourceActive?.isActive) {
      const ref = formatTaskRef(task.taskCode, task.title);
      const rejName = assignee.user.displayName;
      await createNotification(
        transferSourceId,
        taskId,
        'TRANSFER_RECEIVED',
        `Công việc được trả lại: ${ref}`,
        `${rejName} đã từ chối — công việc đã quay lại bạn`,
      );
    } else {
      await checkAllFailed(taskId, task.creatorId);
    }
  } else {
    // Không có source → check allFailed
    await checkAllFailed(taskId, task.creatorId);
  }
}
// ── Reassign ──────────────────────────────────────────────────────────────────

export async function reassign(
  taskId: string,
  data: ReassignData,
  currentUser: SessionUser,
): Promise<void> {
  const task = await getTaskOrThrow(taskId);

  const isPrivileged = ['BOSS', 'ADMIN'].includes(currentUser.role.name);
  const isCreator    = task.creatorId === currentUser.id;

  // APPROVAL: chỉ Boss/Admin mới reassign được
  // DIRECT: creator hoặc Boss/Admin đều có thể reassign
  if (task.workflowMode === 'NEED_APPROVAL') {
    if (!isPrivileged) {
      throw new WorkflowError('FORBIDDEN', 'Trong quy trình phê duyệt, chỉ Boss/Admin mới có thể giao lại');
    }
  } else {
    if (!isPrivileged && !isCreator) {
      throw new WorkflowError('FORBIDDEN', 'Chỉ người tạo hoặc Boss/Admin mới có thể giao lại');
    }
  }

  if (!task.allFailed) {
    throw new WorkflowError(
      'NOT_ALL_FAILED',
      'Chỉ giao lại khi tất cả người thực hiện đã từ chối/chuyển giao',
    );
  }
  if (data.newAssigneeIds.length === 0) {
    throw new WorkflowError('NO_ASSIGNEES', 'Phải chọn ít nhất 1 người thực hiện mới');
  }

  await prisma.$transaction(async (tx) => {
    for (const userId of data.newAssigneeIds) {
      const existing = await tx.taskAssignee.findUnique({
        where: { taskId_userId: { taskId, userId } },
      });
      if (existing) {
        await tx.taskAssignee.update({
          where: { id: existing.id },
          data: { status: 'PENDING', rejectedAt: null, transferNotes: null },
        });
      } else {
        await tx.taskAssignee.create({
          data: { taskId, userId, status: 'PENDING' },
        });
      }
    }

    await tx.task.update({
      where: { id: taskId },
      data: { status: 'WAITING_ACKNOWLEDGE', allFailed: false },
    });

    await tx.taskAuditLog.create({
      data: {
        taskId,
        performedById: currentUser.id,
        action: 'REASSIGNED',
        oldStatus: task.status,
        newStatus: 'WAITING_ACKNOWLEDGE',
        details: { newAssigneeIds: data.newAssigneeIds } as never,
      },
    });
  });

  const ref = formatTaskRef(task.taskCode, task.title);
  const bossName = task.creator.displayName;
  for (const userId of data.newAssigneeIds) {
    await createNotification(
      userId,
      taskId,
      'TASK_ASSIGNED',
      `Được giao lại: ${ref}`,
      `${bossName} đã giao lại công việc cho bạn`,
    );
  }
}
