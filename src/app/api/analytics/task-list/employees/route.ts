import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { analyticsService } from '@/modules/analytics/services/analytics.service';

export async function GET() {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const data = await analyticsService.getTaskListEmployees();
  return NextResponse.json({ data });
}
