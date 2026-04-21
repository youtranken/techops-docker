import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const CONFIG_KEY = 'general_config';

export interface GeneralConfig {
  timezone: string; // IANA timezone, e.g. 'Asia/Bangkok' (VN và TH cùng UTC+7)
}

const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  timezone: 'Asia/Bangkok',
};

export const generalConfigService = {
  async get(): Promise<GeneralConfig> {
    const record = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    if (!record) return DEFAULT_GENERAL_CONFIG;
    const stored = record.value as Partial<GeneralConfig>;
    return { ...DEFAULT_GENERAL_CONFIG, ...stored };
  },

  async update(data: Partial<GeneralConfig>): Promise<GeneralConfig> {
    const current = await this.get();
    const merged: GeneralConfig = { ...current, ...data };
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: merged as unknown as Prisma.InputJsonValue },
      update: { value: merged as unknown as Prisma.InputJsonValue },
    });
    return merged;
  },
};
