import { NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';

export async function GET(req: Request) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const VALID_PERIODS = ['day', 'week', 'month'] as const;
  type Period = typeof VALID_PERIODS[number];
  const rawPeriod = searchParams.get('period') ?? 'day';
  const period: Period = (VALID_PERIODS as readonly string[]).includes(rawPeriod)
    ? (rawPeriod as Period)
    : 'day';

  const result = await analyticsService.getTrends(period);
  return NextResponse.json(result);
}
