import { NextRequest, NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { researchService } from '@/modules/analytics/services/research.service';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const result = await researchService.getOverdueTasks({
    dateFrom: dateFrom ? dayjs(dateFrom).startOf('day').toDate() : undefined,
    dateTo: dateTo ? dayjs(dateTo).endOf('day').toDate() : undefined,
  });
  return NextResponse.json(result);
}
