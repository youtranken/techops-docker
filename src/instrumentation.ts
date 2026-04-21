/**
 * Next.js Instrumentation Hook
 * Chạy 1 lần duy nhất khi server khởi động (không phải mỗi request như layout.tsx).
 * Tài liệu: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Chỉ chạy ở Node.js runtime (không phải Edge), và không chạy khi build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // L11: Set timezone cho toàn bộ Node process.
    // Ưu tiên: SystemConfig DB → APP_TIMEZONE env → default VN
    try {
      const { prisma } = await import('@/lib/prisma');
      const record = await prisma.systemConfig.findUnique({ where: { key: 'general_config' } });
      const tz = (record?.value as Record<string, string> | null)?.timezone;
      if (tz) process.env.TZ = tz;
      else process.env.TZ = process.env.APP_TIMEZONE ?? 'Asia/Bangkok';
    } catch {
      process.env.TZ = process.env.APP_TIMEZONE ?? 'Asia/Bangkok';
    }
    const { startDeadlineReminderCron } = await import('@/lib/cron/deadline-reminder');
    const { startHelpdeskSyncCron } = await import('@/lib/cron/helpdesk-sync');
    const { startDigestCron } = await import('@/lib/cron/digest');
    const { startLogArchiveCron } = await import('@/lib/cron/log-archive');
    const { startOverdueReminderCron } = await import('@/lib/cron/overdue-reminder');
    const { startPasswordExpiryCron } = await import('@/lib/cron/password-expiry');

    startDeadlineReminderCron();
    startHelpdeskSyncCron();
    startDigestCron();
    startLogArchiveCron();
    startOverdueReminderCron();
    startPasswordExpiryCron();
  }
}
