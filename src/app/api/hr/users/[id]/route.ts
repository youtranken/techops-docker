import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAuth } from '@/lib/auth-utils';
import { userService } from '@/modules/hr/services/user.service';
import { validatePassword } from '@/lib/password-policy';
import { z } from 'zod';

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8).optional(),
  roleId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(['ADMIN', 'BOSS']);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  try {
    const user = await userService.getById(id);
    return NextResponse.json({ data: user });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAuth();
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;
  const isPrivileged = ['ADMIN', 'BOSS'].includes(actor.role.name);

  // EMPLOYEE chỉ được sửa thông tin của chính mình
  if (!isPrivileged && actor.id !== id) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  // Chỉ ADMIN/BOSS mới được đổi roleId và isActive
  const updateData = { ...parsed.data };
  if (!isPrivileged) {
    delete updateData.roleId;
    delete updateData.isActive;

    // EMPLOYEE không được đổi password của ADMIN/BOSS
    if (updateData.password !== undefined) {
      const target = await userService.getById(id).catch(() => null);
      const targetRole = target?.role?.name ?? '';
      if (['ADMIN', 'BOSS'].includes(targetRole)) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Không được đổi mật khẩu quản lý' } },
          { status: 403 },
        );
      }
    }
  }

  // Validate password against security policy if provided
  if (updateData.password) {
    const passwordValidation = await validatePassword(updateData.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: { code: 'PASSWORD_POLICY_VIOLATION', message: passwordValidation.errors.join(', ') } },
        { status: 400 },
      );
    }
  }

  try {
    const user = await userService.update(id, updateData, actor.id);
    return NextResponse.json({ data: user });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      );
    }
    if (e.code === 'USER_DUPLICATE') {
      return NextResponse.json(
        { error: { code: 'USER_DUPLICATE', message: e.message } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: 'USER_UPDATE_FAILED', message: 'Failed to update user' } },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole(['ADMIN', 'BOSS']);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  // Prevent self-deletion
  if (id === actor.id) {
    return NextResponse.json(
      { error: { code: 'USER_DELETE_FAILED', message: 'Không thể tự xóa chính mình' } },
      { status: 400 },
    );
  }

  try {
    const user = await userService.deleteHard(id, actor.id);
    return NextResponse.json({ data: { action: 'deleted', user } });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      );
    }
    if (e.code === 'USER_HAS_TASKS') {
      return NextResponse.json(
        { error: { code: 'USER_HAS_TASKS', message: e.message } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: 'USER_DELETE_FAILED', message: 'Failed to delete user' } },
      { status: 500 },
    );
  }
}
