import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSettingsPermission } from '@/lib/auth-utils';
import { priorityService } from '@/modules/settings/services/priority.service';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải là mã hex hợp lệ'),
  level: z.number().int().min(1).max(10),
  isDefault: z.boolean().optional().default(false),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const priorities = await priorityService.list();
  return NextResponse.json(priorities);
}

export async function POST(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireSettingsPermission('priorities');
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const priority = await priorityService.create(parsed.data);
  await logUserActivity({ userId: user.id, action: 'CHANGE_SETTINGS', metadata: { setting: 'priority_created', name: parsed.data.name } });
  return NextResponse.json(priority, { status: 201 });
}
