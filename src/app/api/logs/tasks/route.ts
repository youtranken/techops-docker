import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskAuditLogService } from '@/modules/logs/services/task-audit-log.service';
import type { TaskAction } from '@prisma/client';

export async function GET(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);

  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20);

  const requestedUserId = searchParams.get('userId') ?? undefined;
  const effectiveUserId = isPrivileged ? requestedUserId : undefined;

  const result = await taskAuditLogService.getAll(
    {
      taskTitle: searchParams.get('taskTitle') ?? undefined,
      userId: effectiveUserId,
      action: (searchParams.get('action') as TaskAction) ?? undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      page,
      limit,
    },
    user,
  );

  return NextResponse.json(result);
}
