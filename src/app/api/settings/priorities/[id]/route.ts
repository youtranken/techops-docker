import { NextRequest, NextResponse } from 'next/server';
import { requireSettingsPermission } from '@/lib/auth-utils';
import { priorityService } from '@/modules/settings/services/priority.service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  level: z.number().int().min(1).max(10).optional(),
  isDefault: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireSettingsPermission('priorities');
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ' } },
      { status: 400 }
    );
  }

  const priority = await priorityService.update(id, parsed.data);
  return NextResponse.json(priority);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await requireSettingsPermission('priorities');
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    await priorityService.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Không thể xóa — đang được sử dụng' } },
      { status: 409 }
    );
  }
}
