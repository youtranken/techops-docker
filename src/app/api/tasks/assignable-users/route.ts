import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tasks/assignable-users
 * Returns active BOSS + EMPLOYEE users that can be assigned to tasks.
 * ADMIN excluded — does not participate in task workflows.
 */
export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { name: { in: ['EMPLOYEE', 'BOSS'] } },
    },
    select: {
      id: true,
      displayName: true,
      username: true,
      role: { select: { name: true } },
    },
    orderBy: { displayName: 'asc' },
  });

  return NextResponse.json({ data: users });
}
