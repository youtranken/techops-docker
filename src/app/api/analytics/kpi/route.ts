import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import { parseDate } from '@/lib/date';

export async function GET(req: Request) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);

  const result = await analyticsService.getKpiOverview({
    dateFrom: parseDate(searchParams.get('dateFrom')),
    dateTo: parseDate(searchParams.get('dateTo')),
  });

  return NextResponse.json(result);
}
