/**
 * Shared types, helpers và errors dùng chung cho tất cả workflow services.
 */

import { prisma } from '@/lib/prisma';
import type { TaskStatus } from '@prisma/client';
import { notificationService } from '@/modules/notifications/services/notification.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  role: { name: string };
}

export interface CompleteData {
  reportContent: string;
  files?: { fileName: string; filePath: string; fileSize: number }[];
}

export interface RejectData {
  reason?: string;
}

export interface RejectReviewEntry {
  reason?: string;
  assigneeId?: string;
}

export type RejectReviewData = RejectReviewEntry[];

export interface TransferData {
  newAssigneeId: string;
  notes?: string;
}

export interface ReassignData {
  newAssigneeIds: string[];
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class WorkflowError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format mã tham chiếu task để hiển thị trong thông báo */
export function formatTaskRef(taskCode: string | null | undefined, title: string): string {
  return taskCode ? `[${taskCode}] ${title}` : title;
}

export async function getTaskOrThrow(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignees: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      creator: { select: { id: true, displayName: true } },
    },
  });
  if (!task) throw new WorkflowError('NOT_FOUND', 'Công việc không tồn tại');
  return task;
}

export async function createAuditLog(
  taskId: string,
  performedById: string,
  action: string,
  oldStatus: TaskStatus | null,
  newStatus: TaskStatus | null,
  details?: Record<string, unknown>,
) {
  await prisma.taskAuditLog.create({
    data: {
      taskId,
      performedById,
      action: action as never,
      oldStatus: oldStatus ?? undefined,
      newStatus: newStatus ?? undefined,
      details: details as never,
    },
  });
}

// Critical types — luôn gửi email kể cả Admin chưa setup prefs (fallback default)
const DEFAULT_EMAIL_TYPES = new Set([
  'TASK_ASSIGNED',
  'TRANSFER_RECEIVED',
  'PLAN_APPROVAL_REQUESTED',
  'TASK_APPROVED',
  'TASK_REJECTED',
  'REVIEW_REQUIRED',
  'REVISION_REQUIRED',
  'EXTENSION_REQUESTED',
  'EXTENSION_APPROVED',
  'EXTENSION_REJECTED',
  'TASK_COMPLETED',
  'DEADLINE_REMINDER',
  'ALL_FAILED',
]);

export async function createNotification(
  userId: string,
  taskId: string,
  type: string,
  title: string,
  message: string,
) {
  // Admin does not receive task notification emails
  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } } },
  });

  let shouldEmail = false;

  if (recipient?.role.name !== 'ADMIN') {
    // Master switch: Admin's emailEnabled (system-wide on/off)
    const adminPrefs = await prisma.userNotificationPrefs.findFirst({
      where: { user: { role: { name: 'ADMIN' }, isActive: true } },
      select: { emailEnabled: true },
    });
    const masterEnabled = adminPrefs?.emailEnabled ?? true; // Default true nếu chưa setup

    if (masterEnabled) {
      // System policy = union of emailTypes từ Admin + Boss prefs.
      // Nếu prefs rỗng (chưa setup) → dùng DEFAULT_EMAIL_TYPES để critical actions luôn gửi.
      const allPrefs = await prisma.userNotificationPrefs.findMany({
        where: { user: { role: { name: { in: ['ADMIN', 'BOSS'] } }, isActive: true } },
        select: { emailTypes: true },
      });
      const systemTypes = new Set(allPrefs.flatMap((p) => p.emailTypes as string[]));
      const effective = systemTypes.size > 0 ? systemTypes : DEFAULT_EMAIL_TYPES;
      shouldEmail = effective.has(type);
    }
  }

  await notificationService.create({
    userId,
    taskId,
    type: type as never,
    title,
    message,
    sendEmail: shouldEmail,
  });
}

export async function notifyBosses(
  taskId: string,
  type: string,
  title: string,
  message: string,
) {
  const bosses = await prisma.user.findMany({
    where: { role: { name: { in: ['BOSS', 'ADMIN'] } }, isActive: true },
    select: { id: true },
  });
  for (const boss of bosses) {
    await createNotification(boss.id, taskId, type, title, message);
  }
}

export async function checkAllFailed(taskId: string, creatorId: string): Promise<void> {
  const assignees = await prisma.taskAssignee.findMany({ where: { taskId } });
  const allDone = assignees.every((a) =>
    ['REJECTED', 'TRANSFERRED'].includes(a.status),
  );

  if (allDone && assignees.length > 0) {
    await prisma.task.update({
      where: { id: taskId },
      data: { allFailed: true },
    });

    if (creatorId) {
      await createNotification(
        creatorId,
        taskId,
        'ALL_FAILED',
        'Tất cả đã từ chối công việc của bạn',
        'Tất cả người được giao đã từ chối. Bạn có thể chỉnh sửa và giao lại hoặc hủy công việc.',
      );
    }
  }
}
