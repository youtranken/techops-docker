import { prisma } from '@/lib/prisma';
import type { TaskStatus, Prisma } from '@prisma/client';
import { createNotification, notifyBosses } from './workflow/_shared';
import type { CreateTaskInput, CreateTaskAttachment } from '../validators/create-task.schema';

interface SessionUser {
  id: string;
  role: { name: string };
}

/** Generate taskCode: "YY-NNNN" (e.g. "26-0042"), reset every year. */
async function generateTaskCode(tx: Prisma.TransactionClient): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `${yy}-`;
  const count = await tx.task.count({ where: { taskCode: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

// F1: EMP + IMMEDIATE + self only         → IN_PROGRESS
// F2: EMP + IMMEDIATE + has others        → WAITING_ACKNOWLEDGE
// F3: EMP + NEED_APPROVAL + any           → PENDING_APPROVAL
// F4: BOSS + IMMEDIATE + self only        → IN_PROGRESS
// F5: BOSS + IMMEDIATE + has others       → WAITING_ACKNOWLEDGE
// F6: BOSS + NEED_APPROVAL + any          → WAITING_ACKNOWLEDGE (skip approval)
function resolveInitialStatus(
  creatorRole: string,
  workflowMode: 'IMMEDIATE' | 'NEED_APPROVAL',
  assigneeIds: string[],
  creatorId: string
): TaskStatus {
  const selfOnly = assigneeIds.length === 1 && assigneeIds[0] === creatorId;

  if (workflowMode === 'IMMEDIATE') {
    return selfOnly ? 'IN_PROGRESS' : 'WAITING_ACKNOWLEDGE';
  }

  // NEED_APPROVAL
  if (creatorRole === 'BOSS' || creatorRole === 'ADMIN') {
    return 'WAITING_ACKNOWLEDGE'; // Boss skips approval (F6)
  }
  return 'PENDING_APPROVAL'; // Employee waits for approval (F3)
}

function resolveAssigneeStatus(taskStatus: TaskStatus) {
  return taskStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING';
}

export async function createTask(data: CreateTaskInput & { attachments?: CreateTaskAttachment[] }, currentUser: SessionUser) {
  const taskStatus     = resolveInitialStatus(currentUser.role.name, data.workflowMode, data.assigneeIds, currentUser.id);
  const assigneeStatus = resolveAssigneeStatus(taskStatus);

  const task = await prisma.$transaction(async (tx) => {
    const taskCode = await generateTaskCode(tx);

    const created = await tx.task.create({
      data: {
        taskCode,
        title:         data.title,
        content:       data.content,
        priorityId:    data.priorityId,
        typeId:        data.typeId,
        scheduleStart: new Date(data.scheduleStart),
        scheduleEnd:   new Date(data.scheduleEnd),
        workflowMode:  data.workflowMode,
        isForceMode:   data.isForceMode ?? false,
        status:        taskStatus,
        creatorId:     currentUser.id,
      },
    });

    await tx.taskAssignee.createMany({
      data: data.assigneeIds.map((userId) => ({
        taskId: created.id,
        userId,
        status: assigneeStatus,
        ...(assigneeStatus === 'IN_PROGRESS' ? { acknowledgedAt: new Date() } : {}),
      })),
    });

    // Save task attachments
    if (data.attachments && data.attachments.length > 0) {
      await tx.taskAttachment.createMany({
        data: data.attachments.map((f) => ({
          taskId:     created.id,
          fileName:   f.fileName,
          filePath:   f.filePath,
          fileSize:   f.fileSize,
          uploadedBy: currentUser.id,
        })),
      });
    }

    await tx.taskAuditLog.create({
      data: {
        taskId:          created.id,
        action:          'TASK_CREATED',
        performedById:   currentUser.id,
        newStatus:       taskStatus,
        details: {
          assigneeIds:  data.assigneeIds,
          workflowMode: data.workflowMode,
        },
      },
    });

    return created;
  });
  // Send notifications AFTER transaction commits (uses global prisma, not tx)
  const creator = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { displayName: true },
  });
  const creatorName = creator?.displayName ?? 'Quản lý';

  if (taskStatus === 'PENDING_APPROVAL') {
    await notifyBosses(
      task.id,
      'PLAN_APPROVAL_REQUESTED',
      `Cần duyệt kế hoạch: ${task.taskCode}`,
      `${creatorName} tạo kế hoạch: ${data.title}`,
    );
  } else if (taskStatus !== 'IN_PROGRESS') {
    const notifyUserIds = data.assigneeIds.filter((id) => id !== currentUser.id);
    for (const userId of notifyUserIds) {
      await createNotification(
        userId,
        task.id,
        'TASK_ASSIGNED',
        `Được giao việc: ${task.taskCode}`,
        `${creatorName} giao công việc "${data.title}" cho bạn`,
      );
    }
  }

  return task;
}
