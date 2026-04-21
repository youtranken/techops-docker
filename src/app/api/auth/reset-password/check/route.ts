import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

/**
 * GET /api/auth/reset-password/check?token=xxx
 * Validate token còn hợp lệ (chưa hết hạn / chưa dùng) → cho UI biết để hide form khi expired.
 * Public endpoint (không cần auth) — chỉ trả boolean, không leak userId.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ valid: false });

  try {
    const stored = await getRedis().get(`pwd_reset:${token}`);
    return NextResponse.json({ valid: !!stored });
  } catch {
    // Redis lỗi → conservative: coi như invalid
    return NextResponse.json({ valid: false });
  }
}
