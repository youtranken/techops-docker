import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import dayjs from '@/lib/date';
import type { MonthlyOverview } from './types';

export async function queryMonthlyOverview(year: number): Promise<MonthlyOverview[]> {
  const cacheKey = `analytics:monthly:${year}`;
  const cached = await cache.get<MonthlyOverview[]>(cacheKey);
  if (cached) return cached;

  const yearStart = dayjs().year(year).startOf('year').toDate();
  const yearEnd = dayjs().year(year).endOf('year').toDate();

  const [created, completed, cancelled] = await Promise.all([
    prisma.task.findMany({
      where: { createdAt: { gte: yearStart, lte: yearEnd } },
      select: { createdAt: true },
    }),
    // Lấy cả scheduleEnd để tính on-time đúng công thức
    prisma.task.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: yearStart, lte: yearEnd },
      },
      select: { completedAt: true, scheduleEnd: true },
    }),
    prisma.task.findMany({
      where: {
        status: 'CANCELLED',
        updatedAt: { gte: yearStart, lte: yearEnd },
      },
      select: { updatedAt: true },
    }),
  ]);

  // Build per-month maps
  const createdMap  = new Map<number, number>();
  const completedMap = new Map<number, number>();
  const onTimeMap   = new Map<number, number>(); // số task hoàn thành đúng hạn
  const cancelledMap = new Map<number, number>();

  for (const t of created) {
    const m = dayjs(t.createdAt).month(); // 0-based
    createdMap.set(m, (createdMap.get(m) ?? 0) + 1);
  }

  for (const t of completed) {
    const m = dayjs(t.completedAt!).month();
    completedMap.set(m, (completedMap.get(m) ?? 0) + 1);
    // Đúng hạn: completedAt (ngày) <= scheduleEnd (ngày)
    const completedDay = dayjs(t.completedAt!).startOf('day');
    const deadlineDay  = dayjs(t.scheduleEnd).startOf('day');
    if (!completedDay.isAfter(deadlineDay)) {
      onTimeMap.set(m, (onTimeMap.get(m) ?? 0) + 1);
    }
  }

  for (const t of cancelled) {
    const m = dayjs(t.updatedAt).month();
    cancelledMap.set(m, (cancelledMap.get(m) ?? 0) + 1);
  }

  const MONTH_LABELS = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const result: MonthlyOverview[] = Array.from({ length: 12 }, (_, i) => {
    const completedCount = completedMap.get(i) ?? 0;
    // Công thức đúng: onTimeRate = đúng hạn / hoàn thành (trong tháng này)
    // Không dùng created vì task tạo tháng X có thể hoàn thành tháng X+N
    const onTimeRate = completedCount > 0
      ? Math.round(((onTimeMap.get(i) ?? 0) / completedCount) * 100)
      : 0;
    return {
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      monthLabel: MONTH_LABELS[i],
      created: createdMap.get(i) ?? 0,
      completed: completedCount,
      cancelled: cancelledMap.get(i) ?? 0,
      onTimeRate,
    };
  });

  await cache.set(cacheKey, result, 600);
  return result;
}
