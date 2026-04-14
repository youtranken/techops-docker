import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import dayjs from 'dayjs';
import type { AnalyticsFilters, KpiData } from './types';

export async function queryKpiOverview(filters: AnalyticsFilters): Promise<KpiData> {
  const cacheKey = `analytics:kpi:${JSON.stringify(filters)}`;
  const cached = await cache.get<KpiData>(cacheKey);
  if (cached) return cached;

  const dateFilter = {
    ...(filters.dateFrom && { gte: filters.dateFrom }),
    ...(filters.dateTo && { lte: filters.dateTo }),
  };
  const where = {
    isDeleted: false,
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
  };

  const [
    totalTasksCreated,
    totalCompleted,
    totalCancelled,
    statusGroups,
    priorityGroups,
    priorities,
    typeGroups,
    taskTypes,
    extensionCount,
    workflowGroups,
    completedWithData,
    totalOverdue,
  ] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.task.count({ where: { ...where, status: 'CANCELLED' } }),
    prisma.task.groupBy({ by: ['status'], where, _count: true }),
    prisma.task.groupBy({ by: ['priorityId'], where, _count: true }),
    prisma.priority.findMany({ select: { id: true, name: true, color: true } }),
    prisma.task.groupBy({ by: ['typeId'], where, _count: true }),
    prisma.taskType.findMany({ select: { id: true, name: true, color: true } }),
    prisma.extensionRequest.count({ where: { status: 'PENDING', task: where } }),
    prisma.task.groupBy({ by: ['workflowMode'], where, _count: true }),
    prisma.task.findMany({
      where: { ...where, status: 'COMPLETED', completedAt: { not: null } },
      select: { createdAt: true, completedAt: true, scheduleEnd: true },
    }),
    prisma.task.count({
      where: {
        ...where,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        scheduleEnd: { lt: new Date() },
      },
    }),
  ]);

  const priorityMap = new Map(priorities.map((p) => [p.id, { name: p.name, color: p.color }]));
  const typeMap = new Map(taskTypes.map((t) => [t.id, { name: t.name, color: t.color }]));

  const tasksByStatus: Record<string, number> = {};
  for (const g of statusGroups) tasksByStatus[g.status] = g._count;

  const tasksByWorkflowMode = {
    IMMEDIATE: 0,
    NEED_APPROVAL: 0,
    ...Object.fromEntries(workflowGroups.map((g) => [g.workflowMode, g._count])),
  } as { IMMEDIATE: number; NEED_APPROVAL: number };

  const tasksByPriority = priorityGroups.map((g) => ({
    name: priorityMap.get(g.priorityId)?.name ?? g.priorityId,
    color: priorityMap.get(g.priorityId)?.color ?? '#6b7280',
    count: g._count,
  }));

  const tasksByType = typeGroups.map((g) => ({
    name: typeMap.get(g.typeId)?.name ?? g.typeId,
    color: typeMap.get(g.typeId)?.color ?? '#6b7280',
    count: g._count,
  }));

  let avgCompletionTimeDays = 0;
  if (completedWithData.length > 0) {
    const totalDays = completedWithData.reduce((sum, t) => {
      return sum + Math.max(0, dayjs(t.completedAt!).diff(dayjs(t.createdAt), 'day'));
    }, 0);
    avgCompletionTimeDays = Math.round((totalDays / completedWithData.length) * 10) / 10;
  }

  const onTimeCount = completedWithData.filter(
    (t) => t.completedAt && !dayjs(t.completedAt).isAfter(dayjs(t.scheduleEnd).endOf('day')),
  ).length;
  const onTimeRate =
    completedWithData.length > 0
      ? Math.round((onTimeCount / completedWithData.length) * 100)
      : 0;

  const extensionRate =
    totalTasksCreated > 0 ? Math.round((extensionCount / totalTasksCreated) * 100) : 0;

  const result: KpiData = {
    totalTasksCreated,
    totalCompleted,
    totalCancelled,
    totalOverdue,
    avgCompletionTimeDays,
    onTimeRate,
    extensionRate,
    extensionCount,
    tasksByStatus,
    tasksByWorkflowMode,
    tasksByPriority,
    tasksByType,
  };

  await cache.set(cacheKey, result, 300);
  return result;
}
