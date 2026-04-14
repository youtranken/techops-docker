import { NextRequest, NextResponse } from 'next/server';
import { requireSettingsPermission } from '@/lib/auth-utils';
import { taskTypeService } from '@/modules/settings/services/task-type.service';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(255).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = await requireSettingsPermission('task_types');
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

  const type = await taskTypeService.update(id, parsed.data);
  return NextResponse.json(type);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const user = await requireSettingsPermission('task_types');
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  try {
    await taskTypeService.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: { code: 'DELETE_FAILED', message: 'Không thể xóa — đang được sử dụng' } },
      { status: 409 }
    );
  }
}
