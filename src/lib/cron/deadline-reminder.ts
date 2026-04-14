import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/modules/notifications/services/notification.service';
import dayjs from 'dayjs';

/**
 * Cron job: Runs daily at 8:00 AM
 * Finds tasks with deadline within N days and sends reminders to IN_PROGRESS assignees
 */
export function startDeadlineReminderCron(): void {
  const enabled = process.env.CRON_DEADLINE_REMINDER_ENABLED === 'true';
  const daysBefore = Number(process.env.CRON_DEADLINE_REMINDER_DAYS_BEFORE ?? 3);

  if (!enabled) {
    console.log('⏸️  Deadline reminder cron disabled');
    return;
  }

  cron.schedule('0 8 * * *', async () => {
    console.log(`🔔 Running deadline reminder check (${daysBefore} days before)...`);

    const now = dayjs();
    const targetDate = now.add(daysBefore, 'day').toDate();

    try {
      const tasks = await prisma.task.findMany({
        where: {
          isDeleted: false,
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
        const daysLeft = dayjs(task.scheduleEnd).diff(now, 'day');
        const deadlineStr = dayjs(task.scheduleEnd).format('DD/MM/YYYY HH:mm');
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

      console.log('✅ Deadline reminder check completed');
    } catch (error) {
      console.error('❌ Deadline reminder cron error:', error);
    }
  });

  console.log(
    `✅ Deadline reminder cron started (every day 8:00 AM, ${daysBefore} days before deadline)`,
  );
}
