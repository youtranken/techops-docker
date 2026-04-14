import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { digestConfigService } from '@/modules/settings/services/digest-config.service';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const VALID_CONTENT_TYPES = [
  'DEADLINE_SOON', 'IN_PROGRESS', 'OVERDUE', 'PENDING_APPROVAL', 'SUMMARY_BY_EMPLOYEE',
] as const;

const updateSchema = z.object({
  enabled:       z.boolean(),
  sendWeekly:    z.boolean(),
  sendMonthly:   z.boolean(),
  sendDays:      z.array(z.number().int().min(0).max(6)).default([]),
  sendHour:      z.number().int().min(0).max(23),
  sendMinute:    z.number().int().min(0).max(59),
  contentTypes:  z.array(z.enum(VALID_CONTENT_TYPES)),
  recipientIds:  z.array(z.string().cuid()).default([]),
  emailSubject:  z.string().min(1).max(200),
  emailGreeting: z.string().max(500),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (!['ADMIN', 'BOSS'].includes(user.role.name)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Không có quyền' } }, { status: 403 });
  }
  const config = await digestConfigService.get();
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
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 },
    );
  }
  const config = await digestConfigService.upsert(parsed.data, user.id);
  await logUserActivity({ userId: user.id, action: 'CHANGE_SETTINGS', metadata: { setting: 'digest_config', enabled: parsed.data.enabled } });
  return NextResponse.json(config);
}
