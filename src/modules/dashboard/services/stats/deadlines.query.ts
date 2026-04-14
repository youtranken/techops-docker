import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { UpcomingDeadline } from './types';
import { assigneeSelect, mapAssignees } from './types';

export async function queryUpcomingDeadlines(baseFilter: Prisma.TaskWhereInput): Promise<UpcomingDeadline[]> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.task.findMany({
    where: {
      ...baseFilter,
      isDeleted: false,
      scheduleEnd: { gte: now, lte: in7Days },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    orderBy: { scheduleEnd: 'asc' },
    take: 8,
    select: {
      id: true,
      taskCode: true,
      title: true,
      status: true,
      scheduleEnd: true,
      priority: { select: { name: true, color: true } },
      assignees: assigneeSelect,
    },
  });
  return rows.map((r) => ({ ...r, assignees: mapAssignees(r.assignees) }));
}
