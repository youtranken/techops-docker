import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { retryHelpdeskTickets } from './handler';

interface RetryBody { hdIds: string[] }

/** POST /api/integrations/helpdesk/sync/retry — re-process pending tickets by hdId */
export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  let body: RetryBody;
  try {
    body = await req.json() as RetryBody;
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Body phải là JSON { hdIds: string[] }' } },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.hdIds) || body.hdIds.length === 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_HDIDS', message: 'hdIds phải là mảng không rỗng' } },
      { status: 400 },
    );
  }

  try {
    const result = await retryHelpdeskTickets(body.hdIds);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: 'RETRY_FAILED', message: err instanceof Error ? err.message : 'Retry thất bại' } },
      { status: 500 },
    );
  }
}
