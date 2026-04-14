import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import dayjs from '@/lib/date';
import type { AnalyticsFilters, TaskTypeTime } from './types';

export async function queryAvgTimeByTaskType(
  filters: AnalyticsFilters,
): Promise<TaskTypeTime[]> {
  const cacheKey = `analytics:tasktype:${JSON.stringify(filters)}`;
  const cached = await cache.get<TaskTypeTime[]>(cacheKey);
  if (cached) return cached;

  const dateFilter = {
    ...(filters.dateFrom && { gte: filters.dateFrom }),
    ...(filters.dateTo && { lte: filters.dateTo }),
  };
  const where = {
    isDeleted: false,
    status: 'COMPLETED' as const,
    completedAt: { not: null as null },
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
  };

  const [tasks, taskTypes] = await Promise.all([
    prisma.task.findMany({
      where,
      select: { typeId: true, createdAt: true, completedAt: true },
    }),
    prisma.taskType.findMany({
      select: { id: true, name: true, color: true },
    }),
  ]);

  const typeMap = new Map(taskTypes.map((t) => [t.id, t]));

  // Group by typeId
  const byType = new Map<string, { totalDays: number; count: number }>();
  for (const t of tasks) {
    // Làm tròn lên từng task riêng lẻ (0.25 → 1 ngày, 0.75 → 1 ngày)
    const rawDays = dayjs(t.completedAt!).diff(dayjs(t.createdAt), 'day', true);
    const days = Math.max(1, Math.ceil(rawDays));
    const prev = byType.get(t.typeId) ?? { totalDays: 0, count: 0 };
    byType.set(t.typeId, { totalDays: prev.totalDays + days, count: prev.count + 1 });
  }

  const result: TaskTypeTime[] = [];
  for (const [typeId, { totalDays, count }] of byType) {
    const meta = typeMap.get(typeId);
    if (!meta) continue;
    result.push({
      typeId,
      name: meta.name,
      color: meta.color,
      avgDays: Math.ceil(totalDays / count),
      taskCount: count,
    });
  }

  result.sort((a, b) => b.avgDays - a.avgDays);
  await cache.set(cacheKey, result, 300);
  return result;
}
