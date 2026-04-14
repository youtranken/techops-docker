import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export type UserListItem = {
  id: string;
  displayName: string;
  username: string;
};

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);

  if (!isPrivileged) {
    return NextResponse.json({
      data: [{ id: user.id, displayName: user.displayName, username: user.username }],
    });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, username: true },
    orderBy: { displayName: 'asc' },
  });

  return NextResponse.json({ data: users });
}
