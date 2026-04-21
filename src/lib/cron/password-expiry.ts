import cron from 'node-cron';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { securityConfigService } from '@/modules/settings/services/security-config.service';

const RESET_TOKEN_TTL = 15 * 60; // 15 phút (theo yêu cầu — link reset cho password expiry)
const LOCK_KEY = 'lock:cron:password-expiry';
const LOCK_TTL = 60;

interface RunResult {
  expiredCount: number;
  sentCount: number;
  warningCount: number;
  expiryDays: number;
  skipped: boolean;
  reason?: string;
}

/**
 * Logic check password expiry — tách ra để có thể gọi từ cron HOẶC từ API endpoint dev/test.
 *
 * - Còn 0-3 ngày: gửi email reset link (15 phút TTL, 1 lần/ngày/user)
 * - Đã hết hạn: set mustChangePassword=true (buộc đổi khi login)
 *
 * `bypassDailyLimit=true` để test: bỏ qua check "đã gửi hôm nay" → luôn gửi.
 */
export async function runPasswordExpiryJob(opts?: { bypassDailyLimit?: boolean }): Promise<RunResult> {
  const result: RunResult = {
    expiredCount: 0, sentCount: 0, warningCount: 0, expiryDays: 0, skipped: false,
  };

  const config = await securityConfigService.get();
  const expiryDays = config.passwordPolicy.expiryDays ?? 0;
  result.expiryDays = expiryDays;

  if (expiryDays <= 0) {
    result.skipped = true;
    result.reason = 'policy.expiryDays = 0 (disabled)';
    return result;
  }

  const redis = getRedis();
  const now = new Date();
  const expiredCutoff = new Date(now.getTime() - expiryDays * 86_400_000);
  const warnCutoff = new Date(now.getTime() - (expiryDays - 3) * 86_400_000);

  // 1. Force expire — set mustChangePassword=true cho user đã quá hạn
  const expiredResult = await prisma.user.updateMany({
    where: {
      isActive: true,
      mustChangePassword: false,
      passwordChangedAt: { not: null, lt: expiredCutoff },
    },
    data: { mustChangePassword: true },
  });
  result.expiredCount = expiredResult.count;

  // 2. Warning — gửi email cho user còn 0-3 ngày (chưa quá hạn)
  const warningUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      mustChangePassword: false,
      email: { not: null },
      passwordChangedAt: { not: null, lt: warnCutoff, gte: expiredCutoff },
    },
    select: { id: true, email: true, displayName: true, passwordChangedAt: true },
  });
  result.warningCount = warningUsers.length;

  const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  for (const u of warningUsers) {
    if (!u.email || !u.passwordChangedAt) continue;
    const daysLeft = Math.max(
      0,
      Math.ceil((u.passwordChangedAt.getTime() + expiryDays * 86_400_000 - now.getTime()) / 86_400_000),
    );

    // Tránh spam: nếu hôm nay đã gửi cho user này → skip (trừ khi bypassDailyLimit=true để test)
    const dailyKey = `pwd_expiry_sent:${u.id}:${now.toISOString().slice(0, 10)}`;
    if (!opts?.bypassDailyLimit) {
      const alreadySent = await redis.get(dailyKey).catch(() => null);
      if (alreadySent) continue;
    }

    // Tạo reset token
    const token = randomBytes(32).toString('hex');
    await redis.set(`pwd_reset:${token}`, `${u.id}:reset`, 'EX', RESET_TOKEN_TTL);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendEmail({
        to: u.email,
        subject: `[TechOps] Mật khẩu sắp hết hạn (còn ${daysLeft} ngày)`,
        html: `
<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:14px 14px 0 0;padding:28px 32px;text-align:center">
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff">🔐 Mật khẩu sắp hết hạn</h1>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
      Xin chào <strong>${u.displayName ?? 'bạn'}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
      Mật khẩu TechOps của bạn sẽ hết hạn sau <strong style="color:#dc2626">${daysLeft} ngày</strong>.
      Vui lòng đặt lại mật khẩu mới ngay để tránh bị buộc đổi khi đăng nhập:
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#dc2626;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">
        Đặt lại mật khẩu →
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
      Link có hiệu lực trong <strong>15 phút</strong>.
      Nếu không đặt lại trước khi hết hạn, bạn sẽ bị buộc đổi mật khẩu khi đăng nhập lần kế.<br>
      Hoặc copy link: <span style="color:#dc2626;word-break:break-all">${resetUrl}</span>
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Email tự động từ <strong>TechOps</strong>.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
      });
      // Đánh dấu đã gửi hôm nay (TTL 25h để chắc chắn không double)
      await redis.set(dailyKey, '1', 'EX', 25 * 60 * 60).catch(() => {});
      result.sentCount++;
    } catch (e) {
      console.error(`[PasswordExpiry] Failed to send email to ${u.email}:`, e);
    }
  }

  return result;
}

/**
 * Daily cron — chạy 9 AM mỗi ngày, dùng Redis lock chống double-run.
 */
export function startPasswordExpiryCron(): void {
  const enabled = process.env.CRON_PASSWORD_EXPIRY_ENABLED === 'true';
  if (!enabled) {
    console.log('⏸️  Password expiry cron disabled');
    return;
  }

  cron.schedule('0 9 * * *', async () => {
    const redis = getRedis();
    let acquired = false;
    try {
      acquired = !!(await redis.set(LOCK_KEY, '1', 'EX', LOCK_TTL, 'NX'));
    } catch { /* Redis down — skip */ }
    if (!acquired) {
      console.log('⏭️  [PasswordExpiry] Skip — instance khác đang chạy');
      return;
    }

    console.log('🔐 Running password expiry check...');
    try {
      const r = await runPasswordExpiryJob();
      if (r.skipped) {
        console.log(`   ${r.reason}`);
      } else {
        console.log(`   ✅ Force-expired ${r.expiredCount} users`);
        console.log(`   ✅ Sent reminder email to ${r.sentCount}/${r.warningCount} users (còn ≤ 3 ngày)`);
      }
    } catch (error) {
      console.error('❌ Password expiry cron error:', error);
    } finally {
      try { await redis.del(LOCK_KEY); } catch { /* ignore */ }
    }
  });

  console.log('✅ Password expiry cron started (daily 9 AM)');
}
