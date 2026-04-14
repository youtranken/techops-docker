import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { SessionUser, ActionItem } from './types';

export async function queryActionItems(user: SessionUser): Promise<ActionItem[]> {
  const isBoss = ['BOSS', 'ADMIN'].includes(user.role.name);
  const where: Prisma.TaskWhereInput = isBoss
    ? { isDeleted: false, status: { in: ['PENDING_APPROVAL', 'PENDING_REVIEW'] } }
    : {
        isDeleted: false,
        status: { in: ['WAITING_ACKNOWLEDGE', 'IN_PROGRESS'] },
        assignees: { some: { userId: user.id } },
      };

  return prisma.task.findMany({
    where,
    orderBy: { scheduleEnd: 'asc' },
    take: 8,
    select: {
      id: true,
      taskCode: true,
      title: true,
      status: true,
      scheduleEnd: true,
      priority: { select: { name: true, color: true } },
    },
  });
}
