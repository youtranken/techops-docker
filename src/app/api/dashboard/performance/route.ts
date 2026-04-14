import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { performanceService } from '@/modules/dashboard/services/performance.service';

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const raw = req.nextUrl.searchParams.get('days');
  const days = raw === '7' ? 7 : 30;

  const data = await performanceService.getTrend(user, days);
  return NextResponse.json(data);
}
