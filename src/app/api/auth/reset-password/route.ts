import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { validatePassword as checkPasswordPolicy } from '@/lib/password-policy';
import { rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * POST /api/auth/reset-password
 * Dùng one-time token để đặt lại mật khẩu (không cần đăng nhập).
 */
export async function POST(req: NextRequest) {
  // Rate limit: 10 lần/15 phút/IP — endpoint public, chặn bot brute-force token
  const rl = await rateLimit(`reset-password:${getRateLimitIdentifier(req)}`, { maxRequests: 10, windowSeconds: 900 });
  if (rl) return rl;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } }, { status: 400 });
  }

  const { token, newPassword } = parsed.data;

  // Validate password policy
  const policyResult = await checkPasswordPolicy(newPassword);
  if (!policyResult.valid) {
    return NextResponse.json({ error: { code: 'WEAK_PASSWORD', message: policyResult.errors[0] ?? 'Mật khẩu không đủ mạnh' } }, { status: 400 });
  }

  const redis = getRedis();
  const stored = await redis.get(`pwd_reset:${token}`);
  if (!stored) {
    return NextResponse.json({ error: { code: 'TOKEN_INVALID', message: 'Link đã hết hạn hoặc không hợp lệ' } }, { status: 400 });
  }

  // Format: "{userId}:setup" | "{userId}:reset" | "{userId}" (legacy = reset)
  const colonIdx = stored.lastIndexOf(':');
  const tokenType = colonIdx !== -1 && ['setup', 'reset'].includes(stored.slice(colonIdx + 1))
    ? stored.slice(colonIdx + 1)
    : 'reset';
  const userId = tokenType === 'reset' || tokenType === 'setup' ? stored.slice(0, colonIdx === -1 ? stored.length : colonIdx) : stored;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } });
  if (!user?.isActive) {
    return NextResponse.json({ error: { code: 'USER_INACTIVE', message: 'Tài khoản không hoạt động' } }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      // setup token: giữ mustChangePassword=true → user vẫn bị force đổi mật khẩu sau login lần đầu
      // reset token: set false → admin reset không yêu cầu đổi thêm lần nữa
      data: { password: hashed, passwordChangedAt: new Date(), ...(tokenType !== 'setup' && { mustChangePassword: false }) },
    });
    await tx.userActivityLog.create({
      data: { userId, action: 'PASSWORD_RESET_COMPLETED', metadata: {} },
    });
  });

  // Consume the token — best-effort: nếu Redis lỗi thì bỏ qua (token tự hết hạn sau TTL)
  await redis.del(`pwd_reset:${token}`).catch(() => {});

  return NextResponse.json({ ok: true });
}
