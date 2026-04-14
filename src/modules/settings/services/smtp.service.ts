import { prisma } from '@/lib/prisma';
import type { SmtpConfigInput } from '../types';

export const smtpService = {
  async get() {
    return prisma.smtpConfig.findFirst({ orderBy: { updatedAt: 'desc' } });
  },

  async upsert(data: SmtpConfigInput) {
    const existing = await prisma.smtpConfig.findFirst();
    const payload = {
      host: data.host,
      port: data.port,
      secure: data.secure,
      user: data.user,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      isActive: data.isActive,
      ...(data.password ? { password: data.password } : {}),
    };

    if (existing) {
      return prisma.smtpConfig.update({ where: { id: existing.id }, data: payload });
    }
    if (!data.password) throw new Error('PASSWORD_REQUIRED');
    return prisma.smtpConfig.create({ data: { ...payload, password: data.password } });
  },

  /** Mask password for safe API response */
  mask(config: { password: string; [key: string]: unknown }) {
    return { ...config, password: '••••••••' };
  },
};
