import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAuth } from '@/lib/auth-utils';
import { userService } from '@/modules/hr/services/user.service';
import { validatePassword } from '@/lib/password-policy';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { getRedis } from '@/lib/redis';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ, số và _'),
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).optional(),
  roleId: z.string().cuid(),
  sendSetupLink: z.boolean().optional().default(false),
});

// 24h cho setup link tạo mới — user có thể chưa kiểm tra email ngay
const SETUP_TOKEN_TTL = 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  const isPrivileged = ['ADMIN', 'BOSS'].includes(actor.role.name);

  const { searchParams } = req.nextUrl;
  const filters = {
    search: searchParams.get('search') ?? undefined,
    roleId: searchParams.get('roleId') ?? undefined,
    isActive: searchParams.has('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined,
    page: searchParams.has('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
    createdFrom: searchParams.get('createdFrom') ?? undefined,
    createdTo: searchParams.get('createdTo') ?? undefined,
  };

  // EMPLOYEE chỉ thấy chính mình và các EMPLOYEE khác (không thấy ADMIN/BOSS)
  if (!isPrivileged) {
    const result = await userService.listForEmployee(actor.id, filters);
    return NextResponse.json(result);
  }

  const result = await userService.list(filters);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResponse = await rateLimitApi(identifier);
  if (rateLimitResponse) return rateLimitResponse;

  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const { sendSetupLink, ...data } = parsed.data;

  // Chế độ "gửi link setup": không cần password, tạo mật khẩu ngẫu nhiên
  if (sendSetupLink) {
    if (!data.email) {
      return NextResponse.json(
        { error: { code: 'EMAIL_REQUIRED', message: 'Email bắt buộc khi gửi link thiết lập mật khẩu' } },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString('hex');
    const redis = getRedis();

    // Kiểm tra Redis TRƯỚC khi tạo user — tránh tài khoản orphaned khi Redis không khả dụng
    try {
      await redis.set(`pwd_reset:${token}`, '__placeholder__', 'EX', SETUP_TOKEN_TTL);
    } catch {
      return NextResponse.json(
        { error: { code: 'SERVICE_UNAVAILABLE', message: 'Không thể khởi tạo link thiết lập. Vui lòng thử lại sau.' } },
        { status: 503 }
      );
    }

    // Tạo mật khẩu tạm ngẫu nhiên — user sẽ đặt lại qua link
    const tempPassword = randomBytes(16).toString('hex');

    let user;
    try {
      user = await userService.create(
        { ...data, email: data.email, password: tempPassword, mustChangePassword: true },
        actor.id,
      );
    } catch (err: unknown) {
      await redis.del(`pwd_reset:${token}`).catch(() => {});
      const e = err as { code?: string; message?: string };
      if (e.code === 'USER_DUPLICATE') {
        return NextResponse.json({ error: { code: 'USER_DUPLICATE', message: e.message } }, { status: 409 });
      }
      return NextResponse.json({ error: { code: 'USER_CREATE_FAILED', message: 'Failed to create user' } }, { status: 500 });
    }

    // Lưu token dạng "{userId}:setup" — reset-password API giữ mustChangePassword=true cho loại này
    // (user vẫn bị force đổi mật khẩu lần đầu sau khi login)
    try {
      await redis.set(`pwd_reset:${token}`, `${user.id}:setup`, 'EX', SETUP_TOKEN_TTL);
    } catch {
      return NextResponse.json(
        { data: user, warning: 'Tài khoản đã tạo thành công nhưng không thể tạo link setup. Dùng "Gửi lại link" để resend.' },
        { status: 201 }
      );
    }

    const baseUrl = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const setupUrl = `${baseUrl}/reset-password?token=${token}`;
    const safeDisplayName = user.displayName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeUsername = user.username.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:14px 14px 0 0;padding:28px 32px;text-align:center">
    <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff">🎉 Chào mừng đến TechOps!</h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">Tài khoản của bạn đã được tạo</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 16px;font-size:14px;color:#374151">Xin chào <strong>${safeDisplayName}</strong>,</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6">
      Tài khoản TechOps của bạn đã được tạo với tên đăng nhập: <strong style="font-family:monospace">${safeUsername}</strong>
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6">
      Nhấn vào nút bên dưới để thiết lập mật khẩu và bắt đầu sử dụng:
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${setupUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">
        Thiết lập mật khẩu →
      </a>
    </div>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
      Link có hiệu lực trong <strong>24 giờ</strong>.<br>
      Hoặc copy link: <span style="color:#4f46e5;word-break:break-all">${setupUrl}</span>
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
      to: data.email,
      subject: '[TechOps] Thiết lập mật khẩu tài khoản',
      html,
    });

    if (!emailResult.success) {
      // Vẫn trả về user đã tạo thành công, nhưng cảnh báo email chưa gửi được
      return NextResponse.json(
        { data: user, warning: 'Tài khoản đã tạo nhưng không thể gửi email. Vui lòng kiểm tra cấu hình SMTP.' },
        { status: 201 }
      );
    }

    return NextResponse.json({ data: user }, { status: 201 });
  }

  // Chế độ thông thường: đặt password thủ công
  if (!data.password) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Mật khẩu bắt buộc' } },
      { status: 400 }
    );
  }

  // Validate password against security policy
  const passwordValidation = await validatePassword(data.password);
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: { code: 'PASSWORD_POLICY_VIOLATION', message: passwordValidation.errors.join(', ') } },
      { status: 400 }
    );
  }

  try {
    const user = await userService.create({ ...data, password: data.password }, actor.id);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_DUPLICATE') {
      return NextResponse.json({ error: { code: 'USER_DUPLICATE', message: e.message } }, { status: 409 });
    }
    return NextResponse.json({ error: { code: 'USER_CREATE_FAILED', message: 'Failed to create user' } }, { status: 500 });
  }
}
