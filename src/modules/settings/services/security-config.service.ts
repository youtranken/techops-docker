// ─── Security Config Service ─────────────────────────────────────────────────
// CRUD cấu hình bảo mật sử dụng SystemConfig (key-value store)

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { SecurityConfig } from '../types';
import { DEFAULT_SECURITY_CONFIG } from '../types';

const CONFIG_KEY = 'security_config';

class SecurityConfigService {
  /**
   * Lấy cấu hình bảo mật hiện tại
   * Nếu chưa có trong DB, trả về giá trị mặc định
   */
  async get(): Promise<SecurityConfig> {
    const record = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY },
    });

    if (!record) {
      return DEFAULT_SECURITY_CONFIG;
    }

    // Merge với default để đảm bảo có đủ fields khi schema mở rộng
    return this.mergeWithDefaults(record.value as Partial<SecurityConfig>);
  }

  /**
   * Cập nhật cấu hình bảo mật
   * Sử dụng upsert để tạo mới nếu chưa tồn tại
   */
  async update(config: Partial<SecurityConfig>): Promise<SecurityConfig> {
    const current = await this.get();

    // Deep merge với config hiện tại
    const merged: SecurityConfig = {
      rateLimit: { ...current.rateLimit, ...config.rateLimit },
      passwordPolicy: { ...current.passwordPolicy, ...config.passwordPolicy },
      session: { ...current.session, ...config.session },
    };

    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: merged as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: merged as unknown as Prisma.InputJsonValue,
      },
    });

    return merged;
  }

  /**
   * Reset về giá trị mặc định
   */
  async reset(): Promise<SecurityConfig> {
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: {
        key: CONFIG_KEY,
        value: DEFAULT_SECURITY_CONFIG as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: DEFAULT_SECURITY_CONFIG as unknown as Prisma.InputJsonValue,
      },
    });

    return DEFAULT_SECURITY_CONFIG;
  }

  /**
   * Merge config từ DB với defaults để đảm bảo backward compatibility
   */
  private mergeWithDefaults(stored: Partial<SecurityConfig>): SecurityConfig {
    return {
      rateLimit: {
        ...DEFAULT_SECURITY_CONFIG.rateLimit,
        ...(stored.rateLimit ?? {}),
      },
      passwordPolicy: {
        ...DEFAULT_SECURITY_CONFIG.passwordPolicy,
        ...(stored.passwordPolicy ?? {}),
      },
      session: {
        ...DEFAULT_SECURITY_CONFIG.session,
        ...(stored.session ?? {}),
      },
    };
  }
}

export const securityConfigService = new SecurityConfigService();
