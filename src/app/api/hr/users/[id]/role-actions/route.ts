/**
 * GET /api/hr/users/[id]/role-actions
 *
 * Returns the role-default RoleStatusActions for the user's role.
 * Used by the permissions matrix UI to show baseline (grey) vs overrides.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireRole(['ADMIN']);
  if (actor instanceof NextResponse) return actor;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      roleId: true,
      role: { select: { id: true, name: true, label: true } },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
      { status: 404 },
    );
  }

  const roleActions = await prisma.roleStatusAction.findMany({
    where: { roleId: user.roleId },
    select: {
      status: true,
      workflowMode: true,
      action: true,
      isForceModeLocked: true,
    },
    orderBy: [{ status: 'asc' }, { workflowMode: 'asc' }, { action: 'asc' }],
  });

  return NextResponse.json({ user, roleActions });
}
