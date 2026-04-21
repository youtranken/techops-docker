import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import dayjs from 'dayjs';
import type { AnalyticsFilters, UserPerformance } from './types';

const ACTIVE_STATUSES = new Set(['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'REVISION_REQUIRED']);

export async function queryUserPerformance(filters: AnalyticsFilters): Promise<UserPerformance[]> {
  const cacheKey = `analytics:performance:${JSON.stringify(filters)}`;
  const cached = await cache.get<UserPerformance[]>(cacheKey);
  if (cached) return cached;

  const dateFilter = {
    ...(filters.dateFrom && { gte: filters.dateFrom }),
    ...(filters.dateTo && { lte: filters.dateTo }),
  };
  const taskDateFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
  const userFilter = filters.forUserId ? { userId: filters.forUserId } : {};
  const now = new Date();

  const assignees = await prisma.taskAssignee.findMany({
    where: {
      ...userFilter,
      task: { status: { not: 'CANCELLED' }, ...taskDateFilter },
      user: { role: { name: 'EMPLOYEE' } },
    },
    select: {
      userId: true,
      status: true,
      completedAt: true,
      user: { select: { id: true, displayName: true } },
      task: { select: { createdAt: true, scheduleEnd: true } },
    },
  });

  type CompletedEntry = { assigneeCompletedAt: Date | null; scheduleEnd: Date };

  const userMap = new Map<
    string,
    {
      user: { id: string; displayName: string };
      totalAssigned: number;
      completed: CompletedEntry[];
      inProgress: number;
      rejections: number;
      overdueCount: number;
      transferredCount: number;
    }
  >();

  for (const a of assignees) {
    if (!userMap.has(a.userId)) {
      userMap.set(a.userId, {
        user: a.user,
        totalAssigned: 0,
        completed: [],
        inProgress: 0,
        rejections: 0,
        overdueCount: 0,
        transferredCount: 0,
      });
    }
    const entry = userMap.get(a.userId)!;
    entry.totalAssigned++;

    if (a.status === 'COMPLETED') {
      entry.completed.push({ assigneeCompletedAt: a.completedAt, scheduleEnd: a.task.scheduleEnd });
    } else if (a.status === 'REJECTED') {
      entry.rejections++;
    } else if (a.status === 'TRANSFERRED') {
      entry.transferredCount++;
    } else if (ACTIVE_STATUSES.has(a.status)) {
      entry.inProgress++;
      if (a.task.scheduleEnd < now) entry.overdueCount++;
    }
  }

  const result: UserPerformance[] = [];

  for (const [, { user, totalAssigned, completed, inProgress, rejections, overdueCount, transferredCount }] of userMap) {
    if (totalAssigned === 0) continue;

    const onTime = completed.filter(
      (e) => e.assigneeCompletedAt &&
             !dayjs(e.assigneeCompletedAt).isAfter(dayjs(e.scheduleEnd).endOf('day')),
    );
    const onTimeRate = totalAssigned > 0 ? Math.round((onTime.length / totalAssigned) * 100) : 0;

    result.push({
      userId: user.id,
      displayName: user.displayName,
      totalAssigned,
      tasksCompleted: completed.length,
      inProgress,
      rejectionCount: rejections,
      overdueCount,
      transferredCount,
      onTimeRate,
    });
  }

  result.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  await cache.set(cacheKey, result, 900);
  return result;
}
