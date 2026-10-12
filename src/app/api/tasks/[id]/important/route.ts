import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { taskTrackingService } from '@/modules/tasks/services/task-tracking.service';

interface RouteParams { params: Promise<{ id: string }> }

const bodySchema = z.object({ isImportant: z.boolean() });

/** PATCH /api/tasks/:id/important — Boss/Admin bật/tắt ★ */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } }, { status: 400 });
  }

  const { id } = await params;
  try {
    await taskTrackingService.setImportant(id, parsed.data.isImportant, user);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UPDATE_FAILED';
    const status = message === 'PERMISSION_DENIED' ? 403 : message === 'TASK_NOT_FOUND' ? 404 : 400;
    return NextResponse.json({ error: { code: message, message } }, { status });
  }
}
