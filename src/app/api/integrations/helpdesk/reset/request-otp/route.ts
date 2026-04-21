import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

const OTP_TTL = 10 * 60; // 10 phút

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * POST /api/integrations/helpdesk/reset/request-otp
 * Gửi OTP 6 số đến email của admin để xác nhận reset helpdesk data.
 */
export async function POST() {
  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  if (!actor.email) {
    return NextResponse.json({ error: { code: 'NO_EMAIL', message: 'Admin chưa có email để nhận OTP' } }, { status: 400 });
  }

  const otp = generateOtp();
  const redis = getRedis();
  await redis.set(`helpdesk_reset_otp:${actor.id}`, otp, 'EX', OTP_TTL);

  // Count current helpdesk tasks for info
  const taskCount = await prisma.task.count({ where: { hdNguonNhap: 'helpdesk' } });

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:14px 14px 0 0;padding:28px 32px;text-align:center">
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff">⚠️ Xác nhận Reset Helpdesk</h1>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">
      Bạn đã yêu cầu <strong>xóa toàn bộ ${taskCount.toLocaleString('vi-VN')} task helpdesk</strong>.<br>
      Thao tác này <strong style="color:#dc2626">KHÔNG THỂ HOÀN TÁC</strong>.
    </p>
    <div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:8px;padding:20px 24px;text-align:center;margin:20px 0">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Mã xác nhận OTP của bạn:</p>
      <div style="font-size:36px;font-weight:900;color:#dc2626;letter-spacing:8px">${otp}</div>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">Hiệu lực trong 10 phút</p>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
      Nếu bạn không thực hiện thao tác này, hãy bỏ qua email này và đảm bảo tài khoản của bạn an toàn.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;border-radius:0 0 14px 14px;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Email tự động từ <strong>TechOps</strong>. Vui lòng không trả lời.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const emailResult = await sendEmail({
    to: actor.email,
    subject: '[TechOps] OTP xác nhận Reset Helpdesk Data',
    html,
  });

  if (!emailResult.success) {
    await redis.del(`helpdesk_reset_otp:${actor.id}`).catch(() => {});
    return NextResponse.json(
      { error: { code: 'EMAIL_FAILED', message: 'Không thể gửi OTP. Vui lòng kiểm tra cấu hình SMTP.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, hint: `OTP đã gửi đến ${actor.email}` });
}
