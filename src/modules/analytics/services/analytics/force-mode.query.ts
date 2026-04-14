import { prisma } from '@/lib/prisma';
import type { ForceModeStat } from './types';

export async function queryForceModeStat(): Promise<ForceModeStat> {
  const [total, forced] = await Promise.all([
    prisma.task.count({ where: { isDeleted: false } }),
    prisma.task.count({ where: { isDeleted: false, isForceMode: true } }),
  ]);

  return {
    total,
    forced,
    forcedRate: total > 0 ? Math.round((forced / total) * 100) : 0,
  };
}
