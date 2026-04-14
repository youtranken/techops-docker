import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { userActivityLogService } from '@/modules/logs/services/user-activity-log.service';
import type { UserLogFilters } from '@/modules/logs/types';

export async function GET(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);

  // EMPLOYEE chỉ được xem logs của chính mình
  const requestedUserId = searchParams.get('userId') ?? undefined;
  const effectiveUserId = isPrivileged ? requestedUserId : user.id;

  const filters: UserLogFilters = {
    userId: effectiveUserId,
    action: searchParams.get('action') ?? undefined,
    ipType: searchParams.get('ipType') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    page:  Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10) || 1),
    limit: Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20),
  };

  const result = await userActivityLogService.getAll(filters);
  return NextResponse.json(result);
}
