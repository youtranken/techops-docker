import { prisma } from '@/lib/prisma';
import type { CronConfig } from '../types';

export type { CronConfig };

const DB_KEY = 'helpdesk_cron';

const DEFAULT: CronConfig = {
  enabled:  process.env.CRON_HELPDESK_SYNC_ENABLED === 'true',
  hour:     7,
  minute:   0,
  enabled2: false,
  hour2:    12,
  minute2:  0,
  lastRunAt:  null,
  lastResult: null,
};

/** In-memory cache — tránh query DB liên tục */
let _cache: CronConfig | null = null;

/** Callback đăng ký bởi startHelpdeskSyncCron() để reschedule khi config thay đổi */
let _rescheduleCallback: ((config: CronConfig) => void) | null = null;

class HelpdeskCronConfigService {
  /** Đọc từ cache hoặc DB. Khởi tạo bằng DEFAULT nếu chưa có. */
  async get(): Promise<CronConfig> {
    if (_cache) return { ..._cache };

    try {
      const row = await prisma.systemConfig.findUnique({ where: { key: DB_KEY } });
      if (row) {
        // Merge với DEFAULT để bổ sung các field mới nếu config cũ trong DB thiếu
        _cache = { ...DEFAULT, ...(row.value as unknown as CronConfig) };
      } else {
        // Lần đầu: ghi DEFAULT vào DB
        await prisma.systemConfig.create({ data: { key: DB_KEY, value: DEFAULT as unknown as object } });
        _cache = { ...DEFAULT };
      }
    } catch {
      // DB chưa sẵn sàng (build time, seed...) → dùng DEFAULT
      _cache = { ...DEFAULT };
    }

    return { ..._cache };
  }

  /** Sync version for cron init (gọi sau khi DB sẵn sàng) */
  getSync(): CronConfig {
    return _cache ?? { ...DEFAULT };
  }

  async update(patch: Partial<Pick<CronConfig, 'enabled' | 'hour' | 'minute' | 'enabled2' | 'hour2' | 'minute2'>>): Promise<CronConfig> {
    if (patch.hour !== undefined && (patch.hour < 0 || patch.hour > 23)) {
      throw new Error('Giờ phải từ 0 đến 23');
    }
    if (patch.minute !== undefined && (patch.minute < 0 || patch.minute > 59)) {
      throw new Error('Phút phải từ 0 đến 59');
    }
    if (patch.hour2 !== undefined && (patch.hour2 < 0 || patch.hour2 > 23)) {
      throw new Error('Giờ 2 phải từ 0 đến 23');
    }
    if (patch.minute2 !== undefined && (patch.minute2 < 0 || patch.minute2 > 59)) {
      throw new Error('Phút 2 phải từ 0 đến 59');
    }

    const current = await this.get();
    const updated: CronConfig = { ...current, ...patch };

    // Persist xuống DB
    await prisma.systemConfig.upsert({
      where:  { key: DB_KEY },
      create: { key: DB_KEY, value: updated as unknown as object },
      update: { value: updated as unknown as object },
    });

    _cache = updated;

    // Trigger reschedule ngay lập tức — không cần restart server
    if (_rescheduleCallback) {
      _rescheduleCallback({ ...updated });
    }

    return { ...updated };
  }

  /** Đăng ký callback để cron module tự reschedule khi config thay đổi */
  onReschedule(cb: (config: CronConfig) => void): void {
    _rescheduleCallback = cb;
  }

  /** Gọi sau khi cron chạy xong để cập nhật lastRunAt + lastResult */
  async recordRun(result: CronConfig['lastResult']): Promise<void> {
    const current = await this.get();
    const updated: CronConfig = {
      ...current,
      lastRunAt:  new Date().toISOString(),
      lastResult: result,
    };

    await prisma.systemConfig.upsert({
      where:  { key: DB_KEY },
      create: { key: DB_KEY, value: updated as unknown as object },
      update: { value: updated as unknown as object },
    });

    _cache = updated;
  }
}

export const helpdeskCronConfigService = new HelpdeskCronConfigService();
