import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { taskTrackingService } from '@/modules/tasks/services/task-tracking.service';

/** POST /api/tasks/seen-all — Boss/Admin đánh dấu đã xem tất cả task Hoàn thành */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  const count = await taskTrackingService.markAllSeen(user);
  return NextResponse.json({ ok: true, count });
}
