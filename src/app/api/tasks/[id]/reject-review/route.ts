import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { taskWorkflowService } from '@/modules/tasks/services/task-workflow.service';
import { z } from 'zod';

const rejectReviewSchema = z.object({
  entries: z.array(z.object({
    reason:     z.string().min(1).max(500),
    assigneeId: z.string().cuid().optional(),
  })).min(1).max(20),
});

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const rawEntries = Array.isArray(body.entries) ? body.entries : [{ reason: body.reason, assigneeId: body.assigneeId }];
  const parsed = rejectReviewSchema.safeParse({ entries: rawEntries });
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } }, { status: 400 });
  }

  try {
    await taskWorkflowService.rejectReview(id, parsed.data.entries, user);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}
