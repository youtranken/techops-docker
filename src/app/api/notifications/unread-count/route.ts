import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { notificationService } from '@/modules/notifications/services/notification.service';

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const count = await notificationService.getUnreadCount(user.id);
  return NextResponse.json({ count });
}
