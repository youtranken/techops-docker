import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';
import type { TaskStatus, Prisma } from '@prisma/client';
import { createNotification, notifyBosses } from './workflow/_shared';
import type { CreateTaskInput, CreateTaskAttachment } from '../validators/create-task.schema';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const RESOLVED_UPLOAD_DIR = path.resolve(UPLOAD_DIR);

/**
 * Move file đã upload từ folder `misc/` sang `<taskId>/attachments/`.
 * Khi tạo task, client upload file TRƯỚC khi taskId tồn tại → file vào misc/.
 * Sau khi task được tạo, ta move sang folder đúng để dễ quản lý.
 * Trả về path mới (relative). Nếu move fail → giữ path cũ + log.
 */
async function moveAttachmentToTaskFolder(
  oldRelPath: string,
  taskId: string,
): Promise<string> {
  if (!oldRelPath.startsWith('misc/')) return oldRelPath; // đã ở folder đúng
  const filename = path.basename(oldRelPath);
  const newRelPath = `${taskId}/attachments/${filename}`;
  const oldFull = path.resolve(RESOLVED_UPLOAD_DIR, oldRelPath);
  const newFull = path.resolve(RESOLVED_UPLOAD_DIR, newRelPath);
  // Guard: ensure inside upload dir
  if (!newFull.startsWith(RESOLVED_UPLOAD_DIR)) return oldRelPath;
  try {
    await fs.mkdir(path.dirname(newFull), { recursive: true });
    await fs.rename(oldFull, newFull);
    return newRelPath;
  } catch (err) {
    console.error('[createTask] move attachment failed:', err, { oldRelPath, newRelPath });
    return oldRelPath;
  }
}

interface SessionUser {
  id: string;
  role: { name: string };
}

/** Generate taskCode: "YY-NNNN" (e.g. "26-0042"), reset every year.
 *  Uses MAX instead of COUNT so soft-deletes don't skew the counter.
 */
async function generateTaskCode(tx: Prisma.TransactionClient): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `${yy}-`;
  const last = await tx.task.findFirst({
    where: { taskCode: { startsWith: prefix } },
    orderBy: { taskCode: 'desc' },
    select: { taskCode: true },
  });
  const nextNum = last?.taskCode ? parseInt(last.taskCode.slice(3), 10) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
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
  // S8: assigneeIds must not be empty
  if (!data.assigneeIds || data.assigneeIds.length === 0) {
    throw new Error('ASSIGNEES_REQUIRED');
  }

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
        // G4: Force Mode chỉ áp dụng cho APPROVAL flow
        isForceMode:   data.workflowMode === 'NEED_APPROVAL' ? (data.isForceMode ?? false) : false,
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

    // Save task attachments với filePath cũ (misc/...).
    // Sẽ move file + update path SAU transaction (fs ops không rollback được).
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
  }, { maxWait: 5000, timeout: 10000 });

  // Sau transaction: move file từ misc/ → <taskId>/attachments/ + update DB.
  // Tách ra ngoài transaction vì fs.rename không rollback được.
  if (data.attachments && data.attachments.length > 0) {
    const savedAttachments = await prisma.taskAttachment.findMany({
      where: { taskId: task.id },
      select: { id: true, filePath: true },
    });
    for (const att of savedAttachments) {
      const newPath = await moveAttachmentToTaskFolder(att.filePath, task.id);
      if (newPath !== att.filePath) {
        await prisma.taskAttachment.update({
          where: { id: att.id },
          data: { filePath: newPath },
        });
      }
    }
  }

  // S17: wrap notifications in try/catch — task already committed, don't 500 on notify failure
  try {
    const creator = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { displayName: true },
    });
    const creatorName = creator?.displayName ?? 'Quản lý';

    if (taskStatus === 'PENDING_APPROVAL') {
      await notifyBosses(
        task.id,
        'PLAN_APPROVAL_REQUESTED',
        `Cần duyệt công việc: ${task.taskCode}`,
        `${creatorName} tạo công việc: ${data.title}`,
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
  } catch (notifyErr) {
    console.error('[createTask] notification failed (task created successfully):', notifyErr);
  }

  return task;
}
