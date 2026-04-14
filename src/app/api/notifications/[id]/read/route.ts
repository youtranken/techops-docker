import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { notificationService } from '@/modules/notifications/services/notification.service';

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  await notificationService.markAsRead(id, user.id);
  return NextResponse.json({ ok: true });
}
