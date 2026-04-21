import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

type RouteParams = { params: Promise<{ id: string }> };

const TOKEN_TTL = 15 * 60; // 15 phút cho admin-triggered reset

/**
 * POST /api/hr/users/[id]/send-reset-link
 * Admin/Boss gửi link đặt lại mật khẩu cho user.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  if (!['ADMIN', 'BOSS'].includes(actor.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, displayName: true, isActive: true },
  });

  if (!user) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Người dùng không tồn tại' } }, { status: 404 });
  }
  if (!user.email) {
    return NextResponse.json({ error: { code: 'NO_EMAIL', message: 'Người dùng chưa có email' } }, { status: 400 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: { code: 'USER_INACTIVE', message: 'Tài khoản đã bị vô hiệu hóa' } }, { status: 400 });
  }

  const token = randomBytes(32).toString('hex');
  const redis = getRedis();
  // Lưu dạng "{userId}:reset" — reset-password API sẽ set mustChangePassword=false
  await redis.set(`pwd_reset:${token}`, `${user.id}:reset`, 'EX', TOKEN_TTL);

  const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const safeDisplayName = user.displayName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:14px 14px 0 0;padding:28px 32px;text-align:center">
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff">🔐 Đặt lại mật khẩu</h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">TechOps System</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 16px;font-size:14px;color:#374151">Xin chào <strong>${safeDisplayName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
      Quản trị viên đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
      Nhấn vào nút bên dưới để tạo mật khẩu mới:
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">
        Đặt lại mật khẩu →
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
      Link có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.<br>
      Hoặc copy link: <span style="color:#4f46e5;word-break:break-all">${resetUrl}</span>
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
    to: user.email,
    subject: '[TechOps] Đặt lại mật khẩu tài khoản',
    html,
  });

  if (!emailResult.success) {
    // Clean up the token since email wasn't delivered
    await redis.del(`pwd_reset:${token}`).catch(() => {});
    return NextResponse.json(
      { error: { code: 'EMAIL_FAILED', message: 'Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP.' } },
      { status: 500 },
    );
  }

  await prisma.userActivityLog.create({
    data: {
      userId: actor.id,
      action: 'PASSWORD_RESET_REQUESTED',
      metadata: { targetUserId: user.id },
    },
  });

  return NextResponse.json({ ok: true });
}
