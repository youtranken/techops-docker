import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { RecentTask } from './types';
import { assigneeSelect, mapAssignees } from './types';

export async function queryRecentTasks(baseFilter: Prisma.TaskWhereInput): Promise<RecentTask[]> {
  const rows = await prisma.task.findMany({
    where: { ...baseFilter },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      taskCode: true,
      title: true,
      status: true,
      scheduleEnd: true,
      updatedAt: true,
      priority: { select: { name: true, color: true } },
      assignees: assigneeSelect,
      creator: { select: { displayName: true, profile: { select: { avatarColor: true, avatarUrl: true } } } },
    },
  });
  return rows.map((r) => ({
    ...r,
    assignees: mapAssignees(r.assignees),
    creator: r.creator
      ? {
          displayName: r.creator.displayName,
          avatarColor: r.creator.profile?.avatarColor ?? '#6366f1',
          avatarUrl:   r.creator.profile?.avatarUrl   ?? null,
        }
      : null,
  }));
}
