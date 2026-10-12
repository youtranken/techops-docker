import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskTrackingService } from '@/modules/tasks/services/task-tracking.service';

/** GET /api/tasks/counters — số đếm sidebar: ★ Quan trọng + Hoàn thành chưa xem (Boss/Admin) */
export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  return NextResponse.json(await taskTrackingService.getCounters(user));
}
