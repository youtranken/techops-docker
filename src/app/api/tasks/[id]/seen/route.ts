import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { taskTrackingService } from '@/modules/tasks/services/task-tracking.service';

interface RouteParams { params: Promise<{ id: string }> }

/**
 * POST /api/tasks/:id/seen — Boss/Admin đã mở xem task Hoàn thành.
 * Không cần kiểm tra quyền xem task: chỉ Boss/Admin được ghi (thấy mọi task), nhân viên → markSeen bỏ qua.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  const { id } = await params;
  await taskTrackingService.markSeen(id, user);
  return NextResponse.json({ ok: true });
}
