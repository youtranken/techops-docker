import { prisma } from '@/lib/prisma';
import { createNotification, notifyBosses } from './workflow/_shared';
import type { TaskStatus, AssigneeStatus, Prisma } from '@prisma/client';
import type { UpdateTaskInput } from '../validators/update-task.schema';

interface SessionUser {
  id: string;
  role: { name: string };
}

type FieldChange = { field: string; oldValue: string; newValue: string };

function fmtD(d: Date) {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function updateTask(id: string, data: UpdateTaskInput, currentUser: SessionUser) {
  const existing = await prisma.task.findUnique({
    where: { id },
    include: {
      assignees: { select: { id: true, userId: true, status: true } },
      priority:  { select: { id: true, name: true } },
      type:      { select: { id: true, name: true } },
    },
  });

  if (!existing) throw new Error('TASK_NOT_FOUND');

  const role         = currentUser.role.name;
  const status       = existing.status;
  const isCreator    = existing.creatorId === currentUser.id;
  const workflowMode = existing.workflowMode; // 'IMMEDIATE' | 'NEED_APPROVAL'
  const isAssignee   = existing.assignees.some(
    (a) => a.userId === currentUser.id && !(['REJECTED', 'TRANSFERRED'] as AssigneeStatus[]).includes(a.status),
  );

  // Boss/Admin: edit khi PENDING_APPROVAL, WAITING_ACKNOWLEDGE, IN_PROGRESS, PENDING_REVIEW
  // Employee — Direct (IMMEDIATE):   creator ở WAITING_ACKNOWLEDGE hoặc IN_PROGRESS; assignee ở IN_PROGRESS
  // Employee — Approval (NEED_APPROVAL): chỉ creator ở PENDING_APPROVAL (plan bị lock sau khi Boss duyệt)
  const canEdit =
    (role === 'BOSS' || role === 'ADMIN')
      ? ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(status)
      : workflowMode === 'IMMEDIATE'
          ? (isCreator || isAssignee) && status === 'IN_PROGRESS'
            || isCreator && status === 'WAITING_ACKNOWLEDGE'
          : isCreator && status === 'PENDING_APPROVAL';

  if (!canEdit) throw new Error('PERMISSION_DENIED');

  const updateData: Prisma.TaskUpdateInput = {};
  if (data.title        !== undefined) updateData.title        = data.title;
  if (data.content      !== undefined) updateData.content      = data.content;
  if (data.priorityId   !== undefined) updateData.priority     = { connect: { id: data.priorityId } };
  if (data.typeId       !== undefined) updateData.type         = { connect: { id: data.typeId } };
  if (data.scheduleStart !== undefined) updateData.scheduleStart = new Date(data.scheduleStart);
  if (data.scheduleEnd   !== undefined) updateData.scheduleEnd   = new Date(data.scheduleEnd);

  // G4: Force Mode chỉ áp dụng khi workflow = NEED_APPROVAL
  // - Bật Force Mode trên DIRECT → throw
  // - Đổi flow APPROVAL→DIRECT mà đang bật Force Mode → auto tắt
  const effectiveMode = (data.workflowMode ?? workflowMode);
  if (data.isForceMode  !== undefined && (role === 'BOSS' || role === 'ADMIN')) {
    if (effectiveMode === 'NEED_APPROVAL') {
      updateData.isForceMode = data.isForceMode;
    } else if (data.isForceMode === true) {
      throw new Error('FORCE_MODE_REQUIRES_APPROVAL');
    }
  }
  if (effectiveMode === 'IMMEDIATE' && existing.isForceMode && updateData.isForceMode === undefined) {
    updateData.isForceMode = false;
  }

  const changes: FieldChange[] = [];

  if (data.title !== undefined && data.title !== existing.title)
    changes.push({ field: 'Tiêu đề', oldValue: existing.title, newValue: data.title });

  if (data.content !== undefined && data.content !== existing.content)
    changes.push({ field: 'Nội dung', oldValue: '', newValue: '' });

  if (data.scheduleStart !== undefined) {
    const newDate = new Date(data.scheduleStart);
    if (fmtD(newDate) !== fmtD(existing.scheduleStart))
      changes.push({ field: 'Ngày bắt đầu', oldValue: fmtD(existing.scheduleStart), newValue: fmtD(newDate) });
  }

  if (data.scheduleEnd !== undefined) {
    const newDate = new Date(data.scheduleEnd);
    if (fmtD(newDate) !== fmtD(existing.scheduleEnd))
      changes.push({ field: 'Hạn chót', oldValue: fmtD(existing.scheduleEnd), newValue: fmtD(newDate) });
  }

  if (data.isForceMode !== undefined && data.isForceMode !== existing.isForceMode)
    changes.push({ field: 'Force Mode', oldValue: existing.isForceMode ? 'Bật' : 'Tắt', newValue: data.isForceMode ? 'Bật' : 'Tắt' });

  if (data.workflowMode !== undefined && data.workflowMode !== existing.workflowMode)
    changes.push({ field: 'Quy trình', oldValue: existing.workflowMode === 'IMMEDIATE' ? 'Trực tiếp' : 'Phê duyệt', newValue: data.workflowMode === 'IMMEDIATE' ? 'Trực tiếp' : 'Phê duyệt' });

  if (data.priorityId !== undefined && data.priorityId !== existing.priority.id) {
    const newP = await prisma.priority.findUnique({ where: { id: data.priorityId }, select: { name: true } });
    changes.push({ field: 'Độ ưu tiên', oldValue: existing.priority.name, newValue: newP?.name ?? data.priorityId });
  }

  if (data.typeId !== undefined && data.typeId !== existing.type.id) {
    const newT = await prisma.taskType.findUnique({ where: { id: data.typeId }, select: { name: true } });
    changes.push({ field: 'Loại công việc', oldValue: existing.type.name, newValue: newT?.name ?? data.typeId });
  }

  if (data.assigneeIds) {
    const validIds       = data.assigneeIds.filter(Boolean);
    const currentIds     = existing.assignees.map((a) => a.userId);
    const toAdd          = validIds.filter((uid) => !currentIds.includes(uid));
    const toRemove       = currentIds.filter((uid) => !validIds.includes(uid) && uid !== existing.creatorId);
    if (toAdd.length > 0 || toRemove.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: [...toAdd, ...toRemove] } }, select: { id: true, displayName: true } });
      const nm    = Object.fromEntries(users.map((u) => [u.id, u.displayName]));
      if (toAdd.length)    changes.push({ field: 'Thêm người TH', oldValue: '', newValue: toAdd.map((uid) => nm[uid] ?? uid).join(', ') });
      if (toRemove.length) changes.push({ field: 'Xóa người TH', oldValue: toRemove.map((uid) => nm[uid] ?? uid).join(', '), newValue: '' });
    }
  }

  let statusTransition: TaskStatus | null = null;

  // G1 + G2: Đổi workflowMode (DIRECT ↔ APPROVAL)
  if (data.workflowMode !== undefined && data.workflowMode !== workflowMode) {
    const isPrivileged = role === 'BOSS' || role === 'ADMIN';
    const fromMode = workflowMode;
    const toMode   = data.workflowMode;
    const noOneAcked = existing.assignees.every(
      (a) => ['PENDING', 'REJECTED', 'TRANSFERRED'].includes(a.status),
    );

    // Quyết định cho phép đổi:
    let canChangeMode = false;
    if (isPrivileged) {
      // Q2: cấm Boss đổi APPROVAL → DIRECT khi đang PENDING_REVIEW
      if (status === 'PENDING_REVIEW' && toMode === 'IMMEDIATE') {
        throw new Error('FLOW_SWITCH_FORBIDDEN_PENDING_REVIEW');
      }
      if (['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(status)) {
        canChangeMode = true;
      }
    } else if (isCreator) {
      // EMP creator chỉ đổi khi:
      // (a) APPROVAL → DIRECT ở PENDING_APPROVAL (Boss chưa duyệt)
      // (b) DIRECT → APPROVAL ở WAITING_ACKNOWLEDGE và chưa ai ack
      if (fromMode === 'NEED_APPROVAL' && toMode === 'IMMEDIATE' && status === 'PENDING_APPROVAL') {
        canChangeMode = true;
      } else if (fromMode === 'IMMEDIATE' && toMode === 'NEED_APPROVAL' && status === 'WAITING_ACKNOWLEDGE' && noOneAcked) {
        canChangeMode = true;
      }
    }

    if (!canChangeMode) {
      throw new Error('FLOW_SWITCH_NOT_ALLOWED');
    }

    updateData.workflowMode = toMode;

    // Status transition theo from/to + role:
    if (toMode === 'IMMEDIATE') {
      // → DIRECT: Force Mode tự tắt (G4)
      if (status === 'PENDING_APPROVAL') {
        statusTransition  = 'WAITING_ACKNOWLEDGE';
        updateData.status = 'WAITING_ACKNOWLEDGE';
      }
      // WAITING_ACKNOWLEDGE / IN_PROGRESS: giữ nguyên status
      if (existing.isForceMode && updateData.isForceMode === undefined) {
        updateData.isForceMode = false;
      }
    } else {
      // → APPROVAL
      if (!isPrivileged && status === 'WAITING_ACKNOWLEDGE') {
        // EMP đổi → cần Boss duyệt lại plan
        statusTransition  = 'PENDING_APPROVAL';
        updateData.status = 'PENDING_APPROVAL';
      }
      // Boss/Admin: giữ nguyên status (Q1=X) — Boss tự duyệt, không cần PENDING_APPROVAL
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({ where: { id }, data: updateData });

    // EC-2: Boss đổi deadline → auto-reject pending extensions
    if (data.scheduleEnd !== undefined && (role === 'BOSS' || role === 'ADMIN')) {
      const pendingExtensions = await tx.extensionRequest.findMany({
        where: { taskId: id, status: 'PENDING' },
        select: { id: true, requesterId: true },
      });
      if (pendingExtensions.length > 0) {
        await tx.extensionRequest.updateMany({
          where: { taskId: id, status: 'PENDING' },
          data: { status: 'REJECTED', responseNote: 'Tự động hủy vì Boss đã thay đổi deadline', respondedAt: new Date() },
        });
        await tx.notification.createMany({
          data: pendingExtensions.map((ext) => ({
            userId:  ext.requesterId,
            taskId:  id,
            type:    'EXTENSION_REJECTED' as never,
            title:   'Đơn gia hạn bị hủy',
            message: 'Boss đã thay đổi deadline — đơn gia hạn của bạn đã được tự động hủy',
          })),
        });
      }
    }

    // Handle assignee changes
    if (data.assigneeIds) {
      const currentAssignees    = existing.assignees;
      const currentAssigneeIds  = currentAssignees.map((a) => a.userId);
      const validIds2 = data.assigneeIds.filter(Boolean);
      const toAdd    = validIds2.filter((uid) => !currentAssigneeIds.includes(uid));
      const toRemove = currentAssigneeIds.filter(
        (uid) => !validIds2.includes(uid) && uid !== existing.creatorId,
      );
      const toReset  = currentAssignees.filter(
        (a) => a.status === 'REJECTED' && validIds2.includes(a.userId),
      );

      if (toRemove.length > 0) {
        // Remove PENDING assignees entirely (never acknowledged)
        await tx.taskAssignee.deleteMany({
          where: { taskId: id, userId: { in: toRemove }, status: 'PENDING' },
        });
        // M5: Boss/Admin can also remove IN_PROGRESS assignees
        if (role === 'BOSS' || role === 'ADMIN') {
          await tx.taskAssignee.updateMany({
            where: { taskId: id, userId: { in: toRemove }, status: 'IN_PROGRESS' },
            data: { status: 'REJECTED' as AssigneeStatus },
          });
        }
      }

      for (const a of toReset) {
        await tx.taskAssignee.update({
          where: { id: a.id },
          data:  { status: 'PENDING', rejectedAt: null, transferNotes: null },
        });
      }

      if (toAdd.length > 0) {
        await tx.taskAssignee.createMany({
          data: toAdd.map((userId) => ({ taskId: id, userId, status: 'PENDING' as AssigneeStatus })),
        });
      }

      if (toAdd.length > 0 || toReset.length > 0) {
        await tx.task.update({ where: { id }, data: { allFailed: false } });
      }
    }

    if (data.attachmentsToRemove?.length) {
      await tx.taskAttachment.deleteMany({
        where: { taskId: id, id: { in: data.attachmentsToRemove } },
      });
    }
    if (data.attachmentsToAdd?.length) {
      await tx.taskAttachment.createMany({
        data: data.attachmentsToAdd.map((a) => ({
          taskId:     id,
          fileName:   a.fileName,
          filePath:   a.filePath,
          fileSize:   a.fileSize,
          uploadedBy: currentUser.id,
        })),
      });
    }

    await tx.taskAuditLog.create({
      data: {
        taskId:          id,
        action:          'TASK_UPDATED',
        performedById:   currentUser.id,
        oldStatus:       existing.status,
        newStatus:       (statusTransition ?? existing.status) as TaskStatus,
        details:         { changes } as never,
      },
    });

    return task;
  });

  // Post-transition notifications
  if (statusTransition === 'WAITING_ACKNOWLEDGE') {
    const assigneeIds = existing.assignees.map((a) => a.userId);
    for (const uid of assigneeIds) {
      await createNotification(uid, id, 'TASK_ASSIGNED', 'Công việc được xác nhận', 'Công việc đã được chuyển sang chế độ trực tiếp, vui lòng tiếp nhận.');
    }
  } else if (statusTransition === 'PENDING_APPROVAL') {
    await notifyBosses(id, 'PLAN_APPROVAL_REQUESTED', 'Yêu cầu duyệt công việc', 'Một công việc vừa được chuyển sang chế độ cần duyệt.');
  }

  return updated;
}
