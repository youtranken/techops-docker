import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { taskQueryService } from '@/modules/tasks/services/task-query.service';
import { taskService } from '@/modules/tasks/services/task.service';
import { createTaskSchema } from '@/modules/tasks/validators/create-task.schema';
import type { TaskStatus } from '@prisma/client';
import type { TaskSortField, TaskSortOrder } from '@/modules/tasks/services/task-query.service';

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { searchParams } = req.nextUrl;
  const rawSource = searchParams.get('source');
  const filters = {
    status: (searchParams.get('status') as TaskStatus) || undefined,
    priorityId: searchParams.get('priorityId') || undefined,
    typeId: searchParams.get('typeId') || undefined,
    assigneeId: searchParams.get('assigneeId') || undefined,
    search: searchParams.get('search') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    source: (rawSource === 'helpdesk' || rawSource === 'techops') ? rawSource as 'helpdesk' | 'techops' : undefined,
    sortField: (['createdAt', 'scheduleEnd', 'title', 'status'].includes(searchParams.get('sortField') ?? '')
      ? searchParams.get('sortField') as TaskSortField : undefined),
    sortOrder: (searchParams.get('sortOrder') === 'asc' ? 'asc' : searchParams.get('sortOrder') === 'desc' ? 'desc' : undefined) as TaskSortOrder | undefined,
    hideCompleted: searchParams.get('hideCompleted') === 'true',
    important: searchParams.get('important') === 'true',
    unseenOnly: searchParams.get('unseenOnly') === 'true',
  };

  const result = await taskQueryService.list(filters, user);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Rate limit check for task creation
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResponse = await rateLimitApi(identifier);
  if (rateLimitResponse) return rateLimitResponse;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  try {
    const task = await taskService.create({ ...parsed.data, attachments: body.attachments }, user);
    return NextResponse.json(task, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tạo task thất bại';
    return NextResponse.json(
      { error: { code: 'CREATE_FAILED', message } },
      { status: 400 }
    );
  }
}
