import { NextResponse } from 'next/server';
import { requireRole, validateSameOrigin } from '@/lib/auth-utils';
import { runPasswordExpiryJob } from '@/lib/cron/password-expiry';
import type { NextRequest } from 'next/server';

/**
 * POST /api/dev/test-password-expiry
 * Trigger ngay logic password expiry (KHÔNG đợi cron 9 AM).
 * Bỏ qua giới hạn "1 email/user/ngày" để test gửi nhiều lần.
 *
 * Chỉ ADMIN mới được dùng. Endpoint này dành cho debugging/testing.
 */
export async function POST(req: NextRequest) {
  if (!validateSameOrigin(req)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });
  }

  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  try {
    const result = await runPasswordExpiryJob({ bypassDailyLimit: true });
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.skipped
        ? `Skipped: ${result.reason}`
        : `Force-expired ${result.expiredCount} users · Sent ${result.sentCount}/${result.warningCount} email`,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error('[test-password-expiry] error:', err);
    return NextResponse.json(
      { error: { code: 'EXEC_FAILED', message: e.message ?? 'Lỗi khi chạy job' } },
      { status: 500 },
    );
  }
}
