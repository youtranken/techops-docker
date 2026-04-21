import { prisma } from '@/lib/prisma';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import type { SmtpConfigInput } from '../types';

export const smtpService = {
  async get() {
    return prisma.smtpConfig.findFirst({ orderBy: { updatedAt: 'desc' } });
  },

  async upsert(data: SmtpConfigInput) {
    // M6: validate host and port
    if (!data.host || data.host.trim().length === 0) throw new Error('Host không được để trống');
    if (data.port < 1 || data.port > 65535) throw new Error('Port phải từ 1 đến 65535');
    // Block private/loopback addresses to prevent SSRF via SMTP relay
    if (/^(localhost$|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|0\.0\.0\.0)/.test(data.host.trim())) {
      throw new Error('Host không hợp lệ');
    }

    const existing = await prisma.smtpConfig.findFirst();
    const payload = {
      host: data.host,
      port: data.port,
      secure: data.secure,
      user: data.user,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      isActive: data.isActive,
      // Mã hóa password trước khi lưu DB
      ...(data.password ? { password: encryptSecret(data.password) } : {}),
    };

    if (existing) {
      return prisma.smtpConfig.update({ where: { id: existing.id }, data: payload });
    }
    if (!data.password) throw new Error('PASSWORD_REQUIRED');
    return prisma.smtpConfig.create({ data: { ...payload, password: encryptSecret(data.password) } });
  },

  /** Mask password for safe API response */
  mask(config: { password: string; [key: string]: unknown }) {
    return { ...config, password: '••••••••' };
  },
};

/**
 * Trả về password đã giải mã để dùng trong nodemailer.
 * Gọi trong email.ts thay vì dùng trực tiếp dbConfig.password.
 */
export function decryptSmtpPassword(stored: string): string {
  return decryptSecret(stored);
}
