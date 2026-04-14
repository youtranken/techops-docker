import { prisma } from '@/lib/prisma';
import { createNotification, notifyBosses } from './workflow/_shared';

interface SessionUser {
  id: string;
  role: { name: string };
}

class ExtensionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

export const extensionService = {
  async create(
    taskId: string,
    data: { reason: string; requestedDate: string },
    currentUser: SessionUser,
  ): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId, isDeleted: false },
      include: { assignees: true, extensions: true },
    });
    if (!task) throw new ExtensionError('NOT_FOUND', 'Công việc không tồn tại');

    if (task.status !== 'IN_PROGRESS') {
      throw new ExtensionError('INVALID_STATUS', 'Chỉ có thể xin gia hạn khi đang thực hiện');
    }

    const isAssignee = task.assignees.some(
      (a) => a.userId === currentUser.id && a.status === 'IN_PROGRESS',
    );
    if (!isAssignee) {
      throw new ExtensionError('NOT_ASSIGNEE', 'Bạn không phải người đang thực hiện');
    }

    if (task.isForceMode) {
      throw new ExtensionError('EXTENSION_FORCE_MODE_BLOCKED', 'Không thể xin gia hạn khi Force Mode');
    }

    const hasPending = task.extensions.some((e) => e.status === 'PENDING');
    if (hasPending) {
      throw new ExtensionError('EXTENSION_ALREADY_PENDING', 'Đã có yêu cầu gia hạn đang chờ duyệt');
    }

    const totalCount = task.extensions.length;
    if (totalCount >= 3) {
      throw new ExtensionError('EXTENSION_MAX_REACHED', 'Đã đạt tối đa 3 lần gia hạn');
    }

    const newDate = new Date(data.requestedDate);
    if (isNaN(newDate.getTime()) || newDate <= task.scheduleEnd) {
      throw new ExtensionError('EXTENSION_INVALID_DATE', 'Ngày gia hạn phải sau deadline hiện tại');
    }

    await prisma.$transaction(async (tx) => {
      await tx.extensionRequest.create({
        data: {
          taskId,
          requesterId: currentUser.id,
          reason: data.reason,
          requestedDate: newDate,
          status: 'PENDING',
        },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId,
          performedById: currentUser.id,
          action: 'EXTENSION_REQUESTED',
          details: { requestedDate: newDate.toISOString(), reason: data.reason } as never,
        },
      });
    });

    await notifyBosses(
      taskId,
      'EXTENSION_REQUESTED',
      'Yêu cầu gia hạn mới',
      `Nhân viên xin gia hạn đến ${newDate.toLocaleDateString('vi-VN')}`,
    );
  },

  async approve(
    extensionId: string,
    data: { responseNote?: string },
    currentUser: SessionUser,
  ): Promise<void> {
    if (!['BOSS', 'ADMIN'].includes(currentUser.role.name)) {
      throw new ExtensionError('FORBIDDEN', 'Chỉ Boss/Admin mới có thể duyệt gia hạn');
    }

    const ext = await prisma.extensionRequest.findUnique({
      where: { id: extensionId },
      include: { task: true },
    });
    if (!ext) throw new ExtensionError('EXTENSION_NOT_FOUND', 'Yêu cầu gia hạn không tồn tại');
    if (ext.status !== 'PENDING') {
      throw new ExtensionError('INVALID_STATUS', 'Yêu cầu này đã được xử lý');
    }

    await prisma.$transaction(async (tx) => {
      await tx.extensionRequest.update({
        where: { id: extensionId },
        data: {
          status: 'APPROVED',
          responseNote: data.responseNote ?? null,
          respondedAt: new Date(),
        },
      });
      await tx.task.update({
        where: { id: ext.taskId },
        data: { scheduleEnd: ext.requestedDate },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId: ext.taskId,
          performedById: currentUser.id,
          action: 'EXTENSION_APPROVED',
          details: { newDeadline: ext.requestedDate.toISOString() } as never,
        },
      });
    });

    await createNotification(
      ext.requesterId,
      ext.taskId,
      'EXTENSION_APPROVED',
      'Gia hạn được duyệt',
      `Deadline mới: ${ext.requestedDate.toLocaleDateString('vi-VN')}`,
    );
  },

  async reject(
    extensionId: string,
    data: { responseNote?: string },
    currentUser: SessionUser,
  ): Promise<void> {
    if (!['BOSS', 'ADMIN'].includes(currentUser.role.name)) {
      throw new ExtensionError('FORBIDDEN', 'Chỉ Boss/Admin mới có thể từ chối gia hạn');
    }

    const ext = await prisma.extensionRequest.findUnique({
      where: { id: extensionId },
    });
    if (!ext) throw new ExtensionError('EXTENSION_NOT_FOUND', 'Yêu cầu gia hạn không tồn tại');
    if (ext.status !== 'PENDING') {
      throw new ExtensionError('INVALID_STATUS', 'Yêu cầu này đã được xử lý');
    }

    await prisma.$transaction(async (tx) => {
      await tx.extensionRequest.update({
        where: { id: extensionId },
        data: {
          status: 'REJECTED',
          responseNote: data.responseNote ?? null,
          respondedAt: new Date(),
        },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId: ext.taskId,
          performedById: currentUser.id,
          action: 'EXTENSION_REJECTED',
          details: data.responseNote ? { reason: data.responseNote } as never : undefined,
        },
      });
    });

    await createNotification(
      ext.requesterId,
      ext.taskId,
      'EXTENSION_REJECTED',
      'Gia hạn bị từ chối',
      data.responseNote ? `Lý do: ${data.responseNote}` : 'Yêu cầu gia hạn của bạn đã bị từ chối',
    );
  },

  async withdraw(extensionId: string, currentUser: SessionUser): Promise<void> {
    const ext = await prisma.extensionRequest.findUnique({
      where: { id: extensionId },
    });
    if (!ext) throw new ExtensionError('EXTENSION_NOT_FOUND', 'Yêu cầu gia hạn không tồn tại');
    if (ext.requesterId !== currentUser.id) {
      throw new ExtensionError('FORBIDDEN', 'Chỉ người tạo yêu cầu mới có thể rút lại');
    }
    if (ext.status !== 'PENDING') {
      throw new ExtensionError('INVALID_STATUS', 'Không thể rút yêu cầu đã được xử lý');
    }

    await prisma.$transaction(async (tx) => {
      await tx.extensionRequest.update({
        where: { id: extensionId },
        data: {
          status: 'REJECTED',
          responseNote: 'Withdrawn by requester',
          respondedAt: new Date(),
        },
      });
      await tx.taskAuditLog.create({
        data: {
          taskId: ext.taskId,
          performedById: currentUser.id,
          action: 'EXTENSION_WITHDRAWN',
        },
      });
    });
  },

  async autoCancelPending(taskId: string, reason: string): Promise<void> {
    const pending = await prisma.extensionRequest.findMany({
      where: { taskId, status: 'PENDING' },
    });
    if (pending.length === 0) return;

    await prisma.extensionRequest.updateMany({
      where: { taskId, status: 'PENDING' },
      data: { status: 'REJECTED', responseNote: reason, respondedAt: new Date() },
    });

    for (const ext of pending) {
      await createNotification(
        ext.requesterId,
        taskId,
        'EXTENSION_REJECTED',
        'Gia hạn tự động hủy',
        reason,
      );
    }
  },
};
