import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { taskReferenceService } from '@/modules/logs/services/task-reference.service';

export async function GET(req: Request) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);

  const result = await taskReferenceService.getAll({
    search:       searchParams.get('search')       ?? undefined,
    creatorId:    searchParams.get('creatorId')    ?? undefined,
    scheduleFrom: searchParams.get('scheduleFrom') ?? undefined,
    scheduleTo:   searchParams.get('scheduleTo')   ?? undefined,
    page:  Number(searchParams.get('page')  ?? 1),
    limit: Number(searchParams.get('limit') ?? 20),
  });

  return NextResponse.json(result);
}
