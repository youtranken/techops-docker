import { prisma } from '@/lib/prisma';
import type { DigestConfigInput } from '../types';

const SINGLETON_ID = 'singleton';

export const digestConfigService = {
  async get() {
    return prisma.digestConfig.findUnique({ where: { id: SINGLETON_ID } });
  },

  async upsert(data: DigestConfigInput, updatedBy: string) {
    return prisma.digestConfig.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data, updatedBy },
      update: { ...data, updatedBy },
    });
  },
};
