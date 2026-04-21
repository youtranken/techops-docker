import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskQueryService } from '@/modules/tasks/services/task-query.service';
import { taskService } from '@/modules/tasks/services/task.service';
import { updateTaskSchema } from '@/modules/tasks/validators/update-task.schema';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const task = await taskQueryService.getById(id, user);
  if (!task) {
    return NextResponse.json(
      { error: { code: 'TASK_NOT_FOUND', message: 'Không tìm thấy công việc' } },
      { status: 404 }
    );
  }
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const task = await taskService.update(id, parsed.data, user);
    return NextResponse.json(task);
  } catch (err: unknown) {
    const e = err as { message?: string };
    const code = e.message || 'UPDATE_FAILED';
    const status = code === 'TASK_NOT_FOUND' ? 404 : code === 'PERMISSION_DENIED' ? 403 : 400;
    return NextResponse.json({ error: { code, message: code } }, { status });
  }
}

