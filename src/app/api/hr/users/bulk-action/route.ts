import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { userService } from '@/modules/hr/services/user.service';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['deactivate', 'activate']),
  userIds: z.array(z.string().cuid()).min(1),
});

export async function POST(req: NextRequest) {
  const actor = await requireRole(['ADMIN', 'BOSS']);
  if (actor instanceof NextResponse) return actor;

  const body = await req.json();
  const parsed = bulkActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const { action, userIds } = parsed.data;

  try {
    if (action === 'deactivate') {
      await userService.bulkDeactivate(userIds, actor.id);
    } else {
      await userService.bulkActivate(userIds, actor.id);
    }
    return NextResponse.json({ data: { affected: userIds.length } });
  } catch {
    return NextResponse.json(
      { error: { code: 'BULK_ACTION_FAILED', message: 'Bulk action failed' } },
      { status: 500 },
    );
  }
}
