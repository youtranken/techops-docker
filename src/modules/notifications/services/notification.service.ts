import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { emailTemplateService } from '@/modules/settings/services/email-template.service';
import { notificationPrefsService } from '@/modules/settings/services/notification-prefs.service';
import dayjs from 'dayjs';
import type { NotificationType, Notification } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  taskId?: string;
  type: NotificationType;
  title: string;
  message: string;
  sendEmail?: boolean;
  /** Name of the actor to fill {{assigneeName}} / {{commenterName}} */
  actorName?: string;
}

export interface NotificationWithTask extends Notification {
  task: { id: string; title: string; taskCode: string | null } | null;
}

// ─── Status labels ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING_APPROVAL: 'Chờ duyệt công việc',
  WAITING_ACKNOWLEDGE: 'Chờ xác nhận',
  IN_PROGRESS: 'Đang thực hiện',
  PENDING_REVIEW: 'Chờ review',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
};

// ─── Rich email builder ────────────────────────────────────────────────────────

async function buildRichEmail(
  userId: string, type: string, taskId?: string, actorName?: string,
): Promise<{ subject: string; html: string } | null> {
  const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const [user, task, tpl] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
    taskId ? prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true, taskCode: true, status: true,
        createdAt: true, scheduleStart: true, scheduleEnd: true,
        priority: { select: { name: true, color: true } },
        assignees: {
          where: { status: { notIn: ['REJECTED', 'TRANSFERRED'] } },
          select: { user: { select: { displayName: true } } },
          take: 1,
        },
      },
    }) : Promise.resolve(null),
    emailTemplateService.getByKey(type),
  ]);
  if (!user) return null;
  const taskUrl = taskId ? `${baseUrl}/tasks/${taskId}` : baseUrl;
  const assigneeName = actorName ?? task?.assignees[0]?.user.displayName ?? '—';
  const priorityHtml = task?.priority
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${task.priority.color}22;color:${task.priority.color}">${task.priority.name}</span>`
    : '—';
  const vars: Record<string, string> = {
    userName: user.displayName,
    taskTitle: task?.title ?? '',
    taskCode: task?.taskCode ?? '—',
    createdAt: task?.createdAt ? dayjs(task.createdAt).format('DD/MM/YYYY') : '—',
    deadline: task?.scheduleEnd ? dayjs(task.scheduleEnd).format('DD/MM/YYYY') : '—',
    scheduleStart: task?.scheduleStart ? dayjs(task.scheduleStart).format('DD/MM/YYYY') : '—',
    statusLabel: task?.status ? (STATUS_LABELS[task.status] ?? task.status) : '—',
    priority: priorityHtml,
    taskUrl,
    assigneeName,
    commenterName: actorName ?? '—',
  };
  const sub = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
  return { subject: sub(tpl.subject), html: sub(tpl.body) };
}

// ─── Service ─────────────────────────────────────────────────────────────────

class NotificationService {
  async create(data: CreateNotificationInput): Promise<void> {
    // 1. Create in-app notification
    await prisma.notification.create({
      data: {
        userId: data.userId,
        taskId: data.taskId,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });

    // 2. Optionally send rich email — gated by user notification prefs
    if (data.sendEmail) {
      const canSend = await notificationPrefsService.shouldSendEmail(data.userId, data.type);
      if (canSend) {
        const userEmail = await prisma.user.findUnique({
          where: { id: data.userId }, select: { email: true },
        });
        if (userEmail?.email) {
          try {
            const email = await buildRichEmail(data.userId, data.type, data.taskId, data.actorName);
            if (email) {
              await sendEmail({ to: userEmail.email, subject: email.subject, html: email.html });
            }
          } catch (error) {
            console.error(`[Notification] Email failed for user ${data.userId}:`, error);
          }
        }
      }
    }
  }

  async list(
    userId: string,
    filters: { unreadOnly?: boolean; page?: number; limit?: number } = {},
  ): Promise<{ data: NotificationWithTask[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(filters.limit ?? 20, 50); // Max 50
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(filters.unreadOnly ? { isRead: false } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          task: { select: { id: true, title: true, taskCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}

export const notificationService = new NotificationService();
