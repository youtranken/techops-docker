import { NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';

export async function GET(req: Request) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year) || year < 2020 || year > 2099) {
    return NextResponse.json(
      { error: { code: 'INVALID_YEAR', message: 'Year must be between 2020 and 2099' } },
      { status: 400 },
    );
  }

  const result = await analyticsService.getMonthlyOverview(year);
  return NextResponse.json(result);
}
