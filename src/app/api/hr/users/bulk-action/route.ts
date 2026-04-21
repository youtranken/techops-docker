import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { userService } from '@/modules/hr/services/user.service';
import { z } from 'zod';

const bulkActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('deactivate'), userIds: z.array(z.string().cuid()).min(1) }),
  z.object({ action: z.literal('activate'), userIds: z.array(z.string().cuid()).min(1) }),
  z.object({ action: z.literal('changeRole'), userIds: z.array(z.string().cuid()).min(1), roleId: z.string().cuid() }),
  z.object({ action: z.literal('forceChangePassword'), userIds: z.array(z.string().cuid()).min(1) }),
]);

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
    switch (action) {
      case 'deactivate':
        await userService.bulkDeactivate(userIds, actor.id);
        break;
      case 'activate':
        await userService.bulkActivate(userIds, actor.id);
        break;
      case 'changeRole': {
        const { roleId } = parsed.data as { action: 'changeRole'; userIds: string[]; roleId: string };
        await userService.bulkChangeRole(userIds, roleId, actor.id);
        break;
      }
      case 'forceChangePassword':
        await userService.bulkSetMustChangePassword(userIds, actor.id);
        break;
    }
    return NextResponse.json({ data: { affected: userIds.length } });
  } catch {
    return NextResponse.json(
      { error: { code: 'BULK_ACTION_FAILED', message: 'Bulk action failed' } },
      { status: 500 },
    );
  }
}
