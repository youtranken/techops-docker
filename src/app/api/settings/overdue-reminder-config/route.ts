import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { overdueReminderConfigService } from '@/modules/settings/services/overdue-reminder-config.service';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const updateSchema = z.object({
  enabled:    z.boolean(),
  sendDays:   z.array(z.number().int().min(0).max(6)).default([1,2,3,4,5]),
  sendHour:   z.number().int().min(0).max(23),
  sendMinute: z.number().int().min(0).max(59),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (!['ADMIN', 'BOSS'].includes(user.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }
  const config = await overdueReminderConfigService.get();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (!['ADMIN', 'BOSS'].includes(user.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } }, { status: 400 });
  }

  const config = await overdueReminderConfigService.upsert(parsed.data, user.id);
  await logUserActivity({ userId: user.id, action: 'CHANGE_SETTINGS', metadata: { setting: 'overdue_reminder', enabled: parsed.data.enabled } });
  return NextResponse.json(config);
}
