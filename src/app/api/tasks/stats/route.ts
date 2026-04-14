import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskQueryService } from '@/modules/tasks/services/task-query.service';

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const stats = await taskQueryService.getStats(user);
  return NextResponse.json(stats);
}
