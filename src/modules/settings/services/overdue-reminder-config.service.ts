import { prisma } from '@/lib/prisma';
import type { OverdueReminderConfigInput } from '../types';

const DEFAULT = {
  enabled: false,
  sendDays: [1, 2, 3, 4, 5],
  sendHour: 9,
  sendMinute: 0,
};

export const overdueReminderConfigService = {
  async get() {
    const db = prisma as unknown as { overdueReminderConfig: { findUnique: (a: unknown) => Promise<unknown> } };
    const config = await db.overdueReminderConfig.findUnique({ where: { id: 'singleton' } }) as Record<string, unknown> | null;
    return config ?? { id: 'singleton', ...DEFAULT, updatedAt: new Date(), updatedBy: null };
  },

  async upsert(data: OverdueReminderConfigInput, userId: string) {
    const db = prisma as unknown as { overdueReminderConfig: { upsert: (a: unknown) => Promise<unknown> } };
    return db.overdueReminderConfig.upsert({
      where: { id: 'singleton' },
      update: { ...data, updatedBy: userId },
      create: { id: 'singleton', ...data, updatedBy: userId },
    });
  },
};
