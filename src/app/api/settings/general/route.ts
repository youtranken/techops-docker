import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { z } from 'zod';
import { generalConfigService } from '@/modules/settings/services/general-config.service';
import { logUserActivity } from '@/lib/audit';

const VALID_TIMEZONES = [
  'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur',
  'Asia/Manila', 'Asia/Jakarta', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Paris', 'UTC',
  'America/New_York', 'America/Los_Angeles',
];

const schema = z.object({
  timezone: z.string().refine((v) => VALID_TIMEZONES.includes(v), {
    message: 'Timezone không hợp lệ',
  }),
});

export async function GET() {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;
  const config = await generalConfigService.get();
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' } },
      { status: 400 },
    );
  }

  const updated = await generalConfigService.update(parsed.data);
  await logUserActivity({
    userId: user.id,
    action: 'CHANGE_SETTINGS',
    metadata: { settingType: 'general_config', timezone: parsed.data.timezone },
  });
  return NextResponse.json(updated);
}
