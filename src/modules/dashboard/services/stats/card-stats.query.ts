import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { SessionUser, CardStatsResult } from './types';
import { startOfMonth } from './types';

export async function queryCardStats(
  baseFilter: Prisma.TaskWhereInput,
  user: SessionUser
): Promise<CardStatsResult> {
  const isBoss = ['BOSS', 'ADMIN'].includes(user.role.name);
  const now = new Date();
  const monthStart = startOfMonth();

  const monthFilter: Prisma.TaskWhereInput = {
    ...baseFilter,
    isDeleted: false,
    createdAt: { gte: monthStart },
  };

  const [
    totalTasks,
    completedTasks,
    overdueCount,
    slaTotal,
    pendingApproval,
    pendingReview,
    pendingExtensions,
    myInProgress,
    myWaitingAck,
    tasksByStatusGroups,
    tasksByWorkflowGroups,
    tasksByPriorityGroups,
    priorities,
  ] = await Promise.all([
    prisma.task.count({ where: { ...baseFilter, isDeleted: false } }),

    prisma.task.count({ where: { ...baseFilter, isDeleted: false, status: 'COMPLETED' } }),

    prisma.task.count({
      where: {
        ...baseFilter,
        isDeleted: false,
        scheduleEnd: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),

    prisma.task.count({
      where: { ...baseFilter, isDeleted: false, status: 'COMPLETED', completedAt: { not: null } },
    }),

    isBoss
      ? prisma.task.count({ where: { isDeleted: false, status: 'PENDING_APPROVAL' } })
      : Promise.resolve(0),

    isBoss
      ? prisma.task.count({ where: { isDeleted: false, status: 'PENDING_REVIEW' } })
      : Promise.resolve(0),

    isBoss
      ? prisma.extensionRequest.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),

    !isBoss
      ? prisma.task.count({
          where: {
            isDeleted: false,
            status: 'IN_PROGRESS',
            assignees: { some: { userId: user.id, status: 'IN_PROGRESS' } },
          },
        })
      : Promise.resolve(0),

    !isBoss
      ? prisma.task.count({
          where: {
            isDeleted: false,
            status: 'WAITING_ACKNOWLEDGE',
            assignees: { some: { userId: user.id } },
          },
        })
      : Promise.resolve(0),

    prisma.task.groupBy({
      by: ['status'],
      where: monthFilter,
      _count: true,
    }),

    prisma.task.groupBy({
      by: ['workflowMode'],
      where: monthFilter,
      _count: true,
    }),

    prisma.task.groupBy({
      by: ['priorityId'],
      where: monthFilter,
      _count: true,
    }),

    prisma.priority.findMany({ select: { id: true, name: true, color: true } }),
  ]);

  const tasksByStatus: Record<string, number> = {};
  for (const g of tasksByStatusGroups) tasksByStatus[g.status] = g._count;

  const tasksByWorkflowMode = {
    IMMEDIATE: 0,
    NEED_APPROVAL: 0,
    ...Object.fromEntries(tasksByWorkflowGroups.map((g) => [g.workflowMode, g._count])),
  } as { IMMEDIATE: number; NEED_APPROVAL: number };

  const priorityMap = new Map(priorities.map((p) => [p.id, p]));
  const tasksByPriority = tasksByPriorityGroups.map((g) => {
    const p = priorityMap.get(g.priorityId);
    return { priorityId: g.priorityId, name: p?.name ?? g.priorityId, color: p?.color ?? '#6b7280', count: g._count };
  });

  // SLA: raw SQL to compare completedAt <= scheduleEnd
  const isEmployee = user.role.name === 'EMPLOYEE';
  const slaRaw = isEmployee
    ? await prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*)::int AS cnt FROM "Task"
        WHERE "isDeleted" = false AND status = 'COMPLETED'
          AND "completedAt" IS NOT NULL
          AND "completedAt" < "scheduleEnd"::date + INTERVAL '1 day'
          AND ("creatorId" = ${user.id} OR id IN (
            SELECT "taskId" FROM "TaskAssignee" WHERE "userId" = ${user.id}
          ))`
    : await prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT COUNT(*)::int AS cnt FROM "Task"
        WHERE "isDeleted" = false AND status = 'COMPLETED'
          AND "completedAt" IS NOT NULL
          AND "completedAt" < "scheduleEnd"::date + INTERVAL '1 day'`;

  const slaOnTime = Number(slaRaw[0]?.cnt ?? 0);

  return {
    totalTasks,
    completedTasks,
    overdueCount,
    slaRate: slaTotal > 0 ? ((slaOnTime / slaTotal) * 100).toFixed(1) : '—',
    pendingApproval,
    pendingReview,
    pendingExtensions,
    myInProgress,
    myWaitingAck,
    tasksByStatus,
    tasksByWorkflowMode,
    tasksByPriority,
    completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0',
  };
}
