import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { collectDigestData } from '@/modules/settings/services/digest-data.service';
import { buildDigestHtml, hasAnyData } from '@/modules/settings/services/digest-email.template';
import { sendEmail } from '@/lib/email';
import dayjs from '@/lib/date'; // đã config Asia/Bangkok (VN và TH cùng UTC+7)
import type { DigestContentType } from '@/modules/settings/types';
import { getRedis } from '@/lib/redis';

const LOCK_KEY = 'lock:cron:digest';
const LOCK_TTL = 300; // giây — 5 phút để gửi email xong trước khi lock hết hạn

async function shouldSendToday(config: {
  sendWeekly: boolean; sendMonthly: boolean; sendDays?: unknown;
}): Promise<{ send: boolean; label: string }> {
  const now = dayjs.tz();
  const dayOfWeek = now.day(); // 0=CN,1=T2,...,6=T7
  const dayOfMonth = now.date();
  const lastDay = now.endOf('month').date();

  if (config.sendWeekly && dayOfWeek === 1) return { send: true, label: 'Hàng tuần' };
  if (config.sendMonthly && dayOfMonth === lastDay) return { send: true, label: 'Hàng tháng' };
  const sendDays = Array.isArray(config.sendDays) ? (config.sendDays as number[]) : [];
  if (sendDays.includes(dayOfWeek)) {
    return { send: true, label: 'Hàng ngày' };
  }
  return { send: false, label: '' };
}

export function startDigestCron(): void {
  // Run every minute to check hour:minute match
  cron.schedule('* * * * *', async () => {
    const redis = getRedis();
    let acquired = false;
    try {
      acquired = !!(await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX'));
    } catch { /* Redis down — skip */ }
    if (!acquired) return;

    try {
      const config = await prisma.digestConfig.findUnique({ where: { id: 'singleton' } });
      if (!config?.enabled) return;
      const rawSendDays = (config as unknown as { sendDays?: unknown }).sendDays;
      const sendDaysArr: number[] = Array.isArray(rawSendDays) ? (rawSendDays as number[]) : [];
      if (!config.sendWeekly && !config.sendMonthly && sendDaysArr.length === 0) return;

      const nowVn = dayjs.tz(); // giờ Việt Nam
      if (nowVn.hour() !== config.sendHour || nowVn.minute() !== config.sendMinute) return;

      const { send, label } = await shouldSendToday(config);
      if (!send) return;

      console.log(`📊 Sending digest report (${label})...`);

      // Resolve recipients: explicit list or fallback to all Bosses
      const recipientIds: string[] = Array.isArray(config.recipientIds) ? config.recipientIds : [];
      const recipients = recipientIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: recipientIds }, isActive: true },
            select: { email: true, displayName: true },
          })
        : await prisma.user.findMany({
            where: { isActive: true, role: { name: 'BOSS' } },
            select: { email: true, displayName: true },
          });

      if (recipients.length === 0) { console.log('No recipients to send digest to'); return; }

      const contentTypes = config.contentTypes as DigestContentType[];
      const data = await collectDigestData(contentTypes);

      if (!hasAnyData(data, contentTypes)) {
        console.log('📭 No data to report, skipping digest send');
        return;
      }

      const date = nowVn.format('DD/MM/YYYY');
      const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
      const html = buildDigestHtml(data, contentTypes, config.emailSubject, config.emailGreeting, label, date, baseUrl);
      const subject = config.emailSubject.replace('{date}', date);

      let sent = 0;
      for (const r of recipients) {
        if (!r.email) continue;
        await sendEmail({ to: r.email, subject, html });
        sent++;
      }

      console.log(`✅ Digest sent to ${sent} recipient(s)`);
    } catch (err) {
      console.error('❌ Digest cron error:', err);
    } finally {
      try { await redis.del(LOCK_KEY); } catch { /* ignore */ }
    }
  });

  console.log('✅ Digest report cron started (checking every minute)');
}
