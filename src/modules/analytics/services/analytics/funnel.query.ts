import { prisma } from '@/lib/prisma';
import { type TaskStatus } from '@prisma/client';
import { cache } from '@/lib/cache';
import type { AnalyticsFilters, FunnelStage } from './types';

// Stages theo thứ tự tiến trình workflow:
// Tạo mới → Đã tiếp nhận → Đang thực hiện → Chờ Review (NEED_APPROVAL only) → Hoàn thành
const FUNNEL_STAGES: { stage: string; label: string; statuses: TaskStatus[]; workflowMode?: 'IMMEDIATE' | 'NEED_APPROVAL' }[] = [
  {
    stage: 'created',
    label: 'Tạo mới',
    statuses: [
      'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS',
      'PENDING_REVIEW', 'COMPLETED', 'CANCELLED',
    ],
  },
  {
    stage: 'acknowledged',
    label: 'Đã tiếp nhận',
    statuses: ['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'],
  },
  {
    stage: 'in_progress',
    label: 'Đang thực hiện',
    statuses: ['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'],
  },
  {
    stage: 'pending_review',
    label: 'Chờ Review',
    statuses: ['PENDING_REVIEW', 'COMPLETED'],
    workflowMode: 'NEED_APPROVAL',
  },
  {
    stage: 'completed',
    label: 'Hoàn thành',
    statuses: ['COMPLETED'],
  },
];

export async function queryTaskFlowFunnel(
  filters: AnalyticsFilters,
): Promise<FunnelStage[]> {
  const cacheKey = `analytics:funnel:${JSON.stringify(filters)}`;
  const cached = await cache.get<FunnelStage[]>(cacheKey);
  if (cached) return cached;

  const dateFilter = {
    ...(filters.dateFrom && { gte: filters.dateFrom }),
    ...(filters.dateTo && { lte: filters.dateTo }),
  };
  const baseWhere = {
    isDeleted: false,
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
  };

  const counts = await Promise.all(
    FUNNEL_STAGES.map(({ statuses, workflowMode }) =>
      prisma.task.count({
        where: { ...baseWhere, status: { in: statuses }, ...(workflowMode && { workflowMode }) },
      }),
    ),
  );

  const total = counts[0] ?? 1;
  const result: FunnelStage[] = FUNNEL_STAGES.map(({ stage, label }, i) => ({
    stage,
    label,
    count: counts[i],
    percentage: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));

  await cache.set(cacheKey, result, 300);
  return result;
}
