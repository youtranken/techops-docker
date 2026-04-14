import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { notificationPrefsService } from '@/modules/settings/services/notification-prefs.service';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const VALID_TYPES = [
  'TASK_ASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'TRANSFER_RECEIVED',
  'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED',
  'REVIEW_REQUIRED', 'REVISION_REQUIRED', 'TASK_COMPLETED',
  'COMMENT_ADDED', 'DEADLINE_REMINDER', 'ALL_FAILED', 'PLAN_APPROVAL_REQUESTED',
] as const;

const updateSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailTypes: z.array(z.enum(VALID_TYPES)).optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const isBossAdmin = ['ADMIN', 'BOSS'].includes(user.role.name);
  const prefs = isBossAdmin
    ? await notificationPrefsService.getShared()
    : await notificationPrefsService.get(user.id);
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (user.role.name === 'EMPLOYEE') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Không có quyền chỉnh sửa' } },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 },
    );
  }

  await notificationPrefsService.upsertShared(parsed.data);
  await logUserActivity({ userId: user.id, action: 'CHANGE_SETTINGS', metadata: { setting: 'notification_prefs', emailEnabled: parsed.data.emailEnabled } });
  const updated = await notificationPrefsService.getShared();
  return NextResponse.json(updated);
}
