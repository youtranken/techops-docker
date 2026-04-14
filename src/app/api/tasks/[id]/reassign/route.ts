import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { taskWorkflowService } from '@/modules/tasks/services/task-workflow.service';

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  try {
    await taskWorkflowService.reassign(id, {
      newAssigneeIds: body.newAssigneeIds ?? [],
    }, user);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'FORBIDDEN' ? 403 : 400;
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status });
  }
}
