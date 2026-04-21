import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimitApi, rateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { validatePassword } from '@/lib/password-policy';
import { cache } from '@/lib/cache';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  // S4: Endpoint-specific rate limit — chống brute-force "currentPassword" để leak
  // 5 lần / giờ / user (đủ rộng cho user nhập sai vài lần, đủ chật cho attacker)
  const stricterRl = await rateLimit(`changepw:${user.id}`, { maxRequests: 5, windowSeconds: 3600 });
  if (stricterRl) return stricterRl;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  // Validate password policy
  const policy = await validatePassword(newPassword);
  if (!policy.valid) {
    return NextResponse.json(
      { error: { code: 'PASSWORD_POLICY_VIOLATION', message: policy.errors.join(', ') } },
      { status: 400 },
    );
  }

  // Fetch current password hash
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true, mustChangePassword: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User không tồn tại' } }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!valid) {
    return NextResponse.json(
      { error: { code: 'WRONG_PASSWORD', message: 'Mật khẩu hiện tại không đúng' } },
      { status: 400 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: { code: 'SAME_PASSWORD', message: 'Mật khẩu mới phải khác mật khẩu cũ' } },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false, passwordChangedAt: new Date() },
    });
    await tx.userActivityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED_SELF',
        metadata: { forcedChange: dbUser.mustChangePassword },
      },
    });
  });

  // Invalidate active cache để session tiếp theo đọc lại mustChangePassword = false
  await cache.delete(`user:active:${user.id}`);

  return NextResponse.json({ success: true });
}
