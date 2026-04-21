import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/modules/notifications/services/notification.service';
import dayjs from '@/lib/date'; // sử dụng dayjs đã config Asia/Bangkok (VN và TH cùng UTC+7)
import { getRedis } from '@/lib/redis';

const LOCK_KEY = 'lock:cron:deadline-reminder';
const LOCK_TTL = 60; // giây

/**
 * Cron job: Runs daily at 8:00 AM
 * Finds tasks with deadline within N days and sends reminders to IN_PROGRESS assignees
 */
export function startDeadlineReminderCron(): void {
  const enabled = process.env.CRON_DEADLINE_REMINDER_ENABLED === 'true';
  const daysBeforeRaw = Number(process.env.CRON_DEADLINE_REMINDER_DAYS_BEFORE ?? 3);
  // S16: validate env var — NaN or negative silently disables all reminders
  const daysBefore = Number.isFinite(daysBeforeRaw) && daysBeforeRaw >= 0 ? daysBeforeRaw : 3;
  if (!Number.isFinite(daysBeforeRaw) || daysBeforeRaw < 0) {
    console.warn(`[DeadlineReminder] CRON_DEADLINE_REMINDER_DAYS_BEFORE="${process.env.CRON_DEADLINE_REMINDER_DAYS_BEFORE}" không hợp lệ — dùng mặc định 3 ngày`);
  }

  if (!enabled) {
    console.log('⏸️  Deadline reminder cron disabled');
    return;
  }

  cron.schedule('0 8 * * *', async () => {
    const redis = getRedis();
    let acquired = false;
    try {
      acquired = !!(await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX'));
    } catch { /* Redis down — skip */ }
    if (!acquired) {
      console.log('⏭️  [DeadlineReminder] Bỏ qua — instance khác đang chạy (lock held)');
      return;
    }

    console.log(`🔔 Running deadline reminder check (${daysBefore} days before)...`);
    try {
      const now = dayjs.tz(); // giờ Việt Nam (Asia/Bangkok, UTC+7)
      const targetDate = now.add(daysBefore, 'day').toDate();

      const tasks = await prisma.task.findMany({
        where: {
          status: 'IN_PROGRESS',
          scheduleEnd: {
            gte: now.toDate(),
            lte: targetDate,
          },
        },
        include: {
          assignees: {
            where: { status: 'IN_PROGRESS' },
            include: {
              user: { select: { id: true, email: true, displayName: true } },
            },
          },
        },
      });

      console.log(`📋 Found ${tasks.length} tasks approaching deadline`);

      for (const task of tasks) {
        const daysLeft = dayjs.tz(task.scheduleEnd).diff(now, 'day');
        const deadlineStr = dayjs.tz(task.scheduleEnd).format('DD/MM/YYYY HH:mm');
        const title = `⏰ Deadline sắp đến: ${task.title}`;
        const message = `Task "${task.title}" sẽ đến hạn trong ${daysLeft} ngày (${deadlineStr}). Vui lòng kiểm tra tiến độ.`;

        for (const assignee of task.assignees) {
          await notificationService.create({
            userId: assignee.user.id,
            taskId: task.id,
            type: 'DEADLINE_REMINDER',
            title,
            message,
            sendEmail: true,
          });
        }

        console.log(`  ✅ Sent reminder for: ${task.title} (${task.assignees.length} assignees)`);
      }

      // G12: PENDING_REVIEW sắp đến hạn → notify Boss/Admin (Boss đang ngâm chưa duyệt review)
      const pendingReviewTasks = await prisma.task.findMany({
        where: {
          status: 'PENDING_REVIEW',
          scheduleEnd: { gte: now.toDate(), lte: targetDate },
        },
        select: { id: true, title: true, scheduleEnd: true, taskCode: true },
      });

      if (pendingReviewTasks.length > 0) {
        const bosses = await prisma.user.findMany({
          where: { role: { name: { in: ['BOSS', 'ADMIN'] } }, isActive: true },
          select: { id: true },
        });
        for (const task of pendingReviewTasks) {
          const daysLeft = dayjs.tz(task.scheduleEnd).diff(now, 'day');
          const deadlineStr = dayjs.tz(task.scheduleEnd).format('DD/MM/YYYY HH:mm');
          const ref = task.taskCode ? `[${task.taskCode}] ${task.title}` : task.title;
          for (const boss of bosses) {
            await notificationService.create({
              userId: boss.id,
              taskId: task.id,
              type: 'DEADLINE_REMINDER',
              title: `⏰ Cần duyệt kết quả: ${ref}`,
              message: `Task "${task.title}" đang chờ duyệt và sẽ đến hạn trong ${daysLeft} ngày (${deadlineStr}). Vui lòng review.`,
              sendEmail: true,
            });
          }
        }
        console.log(`📋 Notified ${bosses.length} bosses about ${pendingReviewTasks.length} PENDING_REVIEW tasks`);
      }

      // G3: APPROVAL allFailed → notify Boss hàng ngày cho tới khi reassign
      const allFailedApprovalTasks = await prisma.task.findMany({
        where: {
          allFailed: true,
          workflowMode: 'NEED_APPROVAL',
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        select: { id: true, title: true, taskCode: true, creator: { select: { displayName: true } } },
      });

      if (allFailedApprovalTasks.length > 0) {
        const bosses = await prisma.user.findMany({
          where: { role: { name: { in: ['BOSS', 'ADMIN'] } }, isActive: true },
          select: { id: true },
        });
        for (const task of allFailedApprovalTasks) {
          const ref = task.taskCode ? `[${task.taskCode}] ${task.title}` : task.title;
          for (const boss of bosses) {
            await notificationService.create({
              userId: boss.id,
              taskId: task.id,
              type: 'ALL_FAILED',
              title: `🚨 Cần giao lại: ${ref}`,
              message: `Tất cả người được giao đã từ chối công việc "${task.title}" (do ${task.creator.displayName} tạo). Vui lòng giao lại cho người khác.`,
              sendEmail: true,
            });
          }
        }
        console.log(`📋 Notified ${bosses.length} bosses about ${allFailedApprovalTasks.length} APPROVAL allFailed tasks`);
      }

      console.log('✅ Deadline reminder check completed');
    } catch (error) {
      console.error('❌ Deadline reminder cron error:', error);
    } finally {
      try { await redis.del(LOCK_KEY); } catch { /* ignore */ }
    }
  });

  console.log(
    `✅ Deadline reminder cron started (every day 8:00 AM, ${daysBefore} days before deadline)`,
  );
}
