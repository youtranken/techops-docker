import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { statsService } from '@/modules/dashboard/services/stats.service';

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const stats = await statsService.getOverview(user);
  return NextResponse.json(stats);
}
