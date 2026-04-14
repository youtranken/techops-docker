import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import { parseDate } from '@/lib/date';

export async function GET(req: Request) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const dateFrom  = parseDate(searchParams.get('dateFrom'));
  const dateTo    = parseDate(searchParams.get('dateTo'));
  const userId    = searchParams.get('userId')   ?? undefined;
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize  = [10, 20, 50, 100].includes(parseInt(searchParams.get('pageSize') ?? '20', 10))
    ? parseInt(searchParams.get('pageSize')!, 10) : 20;

  const data = await analyticsService.getTaskList({ dateFrom, dateTo, userId, page, pageSize });
  return NextResponse.json({ data });
}
