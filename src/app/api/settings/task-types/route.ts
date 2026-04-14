import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSettingsPermission } from '@/lib/auth-utils';
import { taskTypeService } from '@/modules/settings/services/task-type.service';
import { rateLimitApi, getRateLimitIdentifier } from '@/lib/rate-limit';
import { logUserActivity } from '@/lib/audit';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(50).optional(),
  description: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const types = await taskTypeService.list();
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const rl = await rateLimitApi(getRateLimitIdentifier(req));
  if (rl) return rl;

  const user = await requireSettingsPermission('task_types');
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const type = await taskTypeService.create({ ...parsed.data, color: parsed.data.color ?? '#6B7280' });
  await logUserActivity({ userId: user.id, action: 'CHANGE_SETTINGS', metadata: { setting: 'task_type_created', name: parsed.data.name } });
  return NextResponse.json(type, { status: 201 });
}
