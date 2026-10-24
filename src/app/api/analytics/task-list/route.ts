import { NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import { parseDayStart, parseDayEnd } from '@/lib/date';

export async function GET(req: Request) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const dateFrom   = parseDayStart(searchParams.get('dateFrom'));
  const dateTo     = parseDayEnd(searchParams.get('dateTo'));
  const userId     = searchParams.get('userId') ?? undefined;
  const search     = searchParams.get('search')?.trim() ?? undefined;
  const sortBy     = (searchParams.get('sortBy') ?? 'createdAt') as 'createdAt' | 'scheduleEnd' | 'status' | 'title';
  const sortOrder  = (searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize   = [10, 20, 50, 100].includes(parseInt(searchParams.get('pageSize') ?? '20', 10))
    ? parseInt(searchParams.get('pageSize')!, 10) : 20;

  const data = await analyticsService.getTaskList({ dateFrom, dateTo, userId, search, sortBy, sortOrder, page, pageSize });
  return NextResponse.json({ data });
}
