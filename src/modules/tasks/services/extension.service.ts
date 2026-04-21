import { prisma } from '@/lib/prisma';
import { createNotification, notifyBosses } from './workflow/_shared';
import dayjs from '@/lib/date';

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
      where: { id: taskId },
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

    // Bug 2: Force Mode chỉ cấm transfer + reject, KHÔNG cấm xin gia hạn
    // (đã bỏ check EXTENSION_FORCE_MODE_BLOCKED)

    // G5: tối đa 2 đơn PENDING cùng lúc (giới hạn đồng thời)
    const pendingExtensions = task.extensions.filter((e) => e.status === 'PENDING');
    if (pendingExtensions.length >= 2) {
      throw new ExtensionError('EXTENSION_PENDING_LIMIT', 'Đã có 2 yêu cầu gia hạn đang chờ duyệt — không thể tạo thêm');
    }

    // G5: tổng lifetime tối đa 5 lần / task (PENDING + APPROVED + REJECTED)
    const totalCount = task.extensions.length;
    if (totalCount >= 5) {
      throw new ExtensionError('EXTENSION_MAX_REACHED', 'Đã đạt tối đa 5 lần xin gia hạn cho công việc này');
    }

    const newDate = new Date(data.requestedDate);
    if (isNaN(newDate.getTime())) {
      throw new ExtensionError('EXTENSION_INVALID_DATE', 'Ngày gia hạn không hợp lệ');
    }
    // L7: requestedDate phải sau TODAY (giờ VN) VÀ sau scheduleEnd hiện tại
    const todayVn = dayjs.tz().startOf('day').toDate();
    if (newDate <= todayVn) {
      throw new ExtensionError('EXTENSION_INVALID_DATE', 'Ngày gia hạn phải sau ngày hôm nay');
    }
    if (newDate <= task.scheduleEnd) {
      throw new ExtensionError('EXTENSION_INVALID_DATE', 'Ngày gia hạn phải sau deadline hiện tại');
    }
    // Bug 4: nếu đã có đơn PENDING, đơn mới phải có requestedDate LỚN HƠN đơn PENDING gần nhất
    // (chống tạo trùng / tạo lùi ngày)
    if (pendingExtensions.length > 0) {
      const maxPendingDate = pendingExtensions.reduce(
        (max, e) => (e.requestedDate > max ? e.requestedDate : max),
        pendingExtensions[0].requestedDate,
      );
      if (newDate <= maxPendingDate) {
        throw new ExtensionError(
          'EXTENSION_DATE_NOT_LATER',
          `Ngày gia hạn mới phải sau ngày của đơn đang chờ duyệt (${maxPendingDate.toLocaleDateString('vi-VN')})`,
        );
      }
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

    // Bug 3: lookup tên người THỰC SỰ xin gia hạn (không phải creator của task)
    const requester = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { displayName: true },
    });
    const requesterName = requester?.displayName ?? 'Nhân viên';
    const taskRef = task.taskCode ? `[${task.taskCode}] ${task.title}` : task.title;

    await notifyBosses(
      taskId,
      'EXTENSION_REQUESTED',
      `${requesterName} xin gia hạn: ${taskRef}`,
      `${requesterName} xin gia hạn task "${task.title}" đến ${newDate.toLocaleDateString('vi-VN')}.${data.reason ? ` Lý do: ${data.reason}` : ''}`,
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
      include: {
        task: {
          include: {
            assignees: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
              select: { userId: true },
            },
          },
        },
      },
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

    // Khi approve: thông báo toàn bộ assignee active (deadline đổi → ai cũng cần biết)
    // Khi reject: chỉ thông báo người request (handled in reject())
    const deadlineMsg = `Deadline mới: ${ext.requestedDate.toLocaleDateString('vi-VN')}`;
    const activeAssigneeIds = ext.task?.assignees.map((a) => a.userId) ?? [];
    const toNotify = Array.from(new Set([ext.requesterId, ...activeAssigneeIds]));
    for (const userId of toNotify) {
      await createNotification(userId, ext.taskId, 'EXTENSION_APPROVED', 'Gia hạn được duyệt', deadlineMsg);
    }
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

};
