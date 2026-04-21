import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/verify-email?token=xxx
 * Xác nhận địa chỉ email qua token một lần.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing_token', req.url));
  }

  const redis = getRedis();
  const stored = await redis.get(`email_verify:${token}`);

  if (!stored) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid_or_expired', req.url));
  }

  const [userId, email] = stored.split(':');

  // Verify the email still matches the user's current email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user || user.email !== email) {
    await redis.del(`email_verify:${token}`);
    return NextResponse.redirect(new URL('/verify-email?error=email_changed', req.url));
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  await redis.del(`email_verify:${token}`);

  return NextResponse.redirect(new URL('/verify-email?success=1', req.url));
}
