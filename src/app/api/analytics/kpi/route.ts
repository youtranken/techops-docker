import { NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import { parseDayStart, parseDayEnd } from '@/lib/date';

export async function GET(req: Request) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);

  const result = await analyticsService.getKpiOverview({
    dateFrom: parseDayStart(searchParams.get('dateFrom')),
    dateTo: parseDayEnd(searchParams.get('dateTo')),
  });

  return NextResponse.json(result);
}
