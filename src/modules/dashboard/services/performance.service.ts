import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  role: { name: string };
}

export interface PerformancePoint {
  date: string;   // "2026-03-07"
  created: number;
  completed: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

function buildSecurityFilter(user: SessionUser): Prisma.TaskWhereInput {
  if (user.role.name === 'EMPLOYEE') {
    return {
      OR: [
        { creatorId: user.id },
        { assignees: { some: { userId: user.id } } },
      ],
    };
  }
  return {};
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDateRange(days: number): { start: Date; dates: string[] } {
  const now = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(toDateStr(d));
  }
  return { start: new Date(dates[0] + 'T00:00:00.000Z'), dates };
}

class PerformanceService {
  async getTrend(user: SessionUser, days: 7 | 30 = 30): Promise<PerformancePoint[]> {
    const baseFilter = buildSecurityFilter(user);
    const { start, dates } = buildDateRange(days);

    // Lấy tasks tạo mới trong khoảng và tasks hoàn thành trong khoảng
    const [createdRows, completedRows] = await Promise.all([
      prisma.task.findMany({
        where: { ...baseFilter, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.task.findMany({
        where: {
          ...baseFilter,
          status: 'COMPLETED',
          completedAt: { gte: start, not: null },
        },
        select: { completedAt: true },
      }),
    ]);

    // Group theo ngày
    const createdMap: Record<string, number> = {};
    for (const r of createdRows) {
      const d = toDateStr(r.createdAt);
      createdMap[d] = (createdMap[d] ?? 0) + 1;
    }

    const completedMap: Record<string, number> = {};
    for (const r of completedRows) {
      if (!r.completedAt) continue;
      const d = toDateStr(r.completedAt);
      completedMap[d] = (completedMap[d] ?? 0) + 1;
    }

    return dates.map((date) => ({
      date,
      created: createdMap[date] ?? 0,
      completed: completedMap[date] ?? 0,
    }));
  }
}

export const performanceService = new PerformanceService();
