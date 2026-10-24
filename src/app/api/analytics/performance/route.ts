import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';
import { parseDayStart, parseDayEnd } from '@/lib/date';

export async function GET(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);

  // RLS: EMPLOYEE chỉ xem được performance của mình
  // BOSS/ADMIN xem được tất cả
  const forUserId = user.role.name === 'EMPLOYEE' ? user.id : undefined;

  const result = await analyticsService.getUserPerformance({
    dateFrom: parseDayStart(searchParams.get('dateFrom')),
    dateTo: parseDayEnd(searchParams.get('dateTo')),
    forUserId,
  });

  return NextResponse.json(result);
}
