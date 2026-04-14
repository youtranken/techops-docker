import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { notificationService } from '@/modules/notifications/services/notification.service';

export async function GET(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const result = await notificationService.list(user.id, { unreadOnly, page, limit });
  return NextResponse.json(result);
}
