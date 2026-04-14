import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import dayjs from 'dayjs';
import type { TrendData } from './types';

export async function queryTrends(period: 'day' | 'week' | 'month' = 'day'): Promise<TrendData[]> {
  const cacheKey = `analytics:trends:${period}`;
  const cached = await cache.get<TrendData[]>(cacheKey);
  if (cached) return cached;

  const days = period === 'month' ? 90 : period === 'week' ? 56 : 30;
  const from = dayjs().subtract(days, 'day').startOf('day').toDate();

  const [created, completed] = await Promise.all([
    prisma.task.findMany({
      where: { isDeleted: false, createdAt: { gte: from } },
      select: { createdAt: true },
    }),
    prisma.task.findMany({
      where: { isDeleted: false, status: 'COMPLETED', completedAt: { gte: from } },
      select: { completedAt: true },
    }),
  ]);

  const fmt =
    period === 'month' ? 'YYYY-MM' : period === 'week' ? 'YYYY-[W]WW' : 'YYYY-MM-DD';
  const createdMap = new Map<string, number>();
  const completedMap = new Map<string, number>();

  for (const t of created) {
    const key = dayjs(t.createdAt).format(fmt);
    createdMap.set(key, (createdMap.get(key) ?? 0) + 1);
  }
  for (const t of completed) {
    const key = dayjs(t.completedAt!).format(fmt);
    completedMap.set(key, (completedMap.get(key) ?? 0) + 1);
  }

  const allKeys = new Set([...createdMap.keys(), ...completedMap.keys()]);
  const result: TrendData[] = [...allKeys]
    .sort()
    .map((date) => ({
      date,
      created: createdMap.get(date) ?? 0,
      completed: completedMap.get(date) ?? 0,
    }));

  await cache.set(cacheKey, result, 600);
  return result;
}
