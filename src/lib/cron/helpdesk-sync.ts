import cron from 'node-cron';
import { helpdeskSyncService } from '@/modules/helpdesk/services/helpdesk-sync.service';
import { prisma } from '@/lib/prisma';
import { helpdeskCronConfigService } from '@/modules/helpdesk/services/helpdesk-cron-config.service';
import type { CronConfig } from '@/modules/helpdesk/services/helpdesk-cron-config.service';

/** Tasks đang chạy — giữ ref để hủy khi reschedule */
let _task:  ReturnType<typeof cron.schedule> | null = null;
let _task2: ReturnType<typeof cron.schedule> | null = null;

/** Tạo cron expression từ giờ/phút */
function toExpression(hour: number, minute: number): string {
  return `${minute} ${hour} * * *`;
}

/** Logic chạy khi cron trigger */
async function runSync(): Promise<void> {
  console.log('🔄 [HelpdeskSync] Bắt đầu auto-sync...');
  try {
    const result = await helpdeskSyncService.sync();
    await Promise.allSettled([
      helpdeskCronConfigService.recordRun({
        synced:  result.synced,
        pending: result.pending,
        skipped: result.skipped,
        errors:  result.errors.length,
      }),
      prisma.helpdeskSyncLog.create({
        data: {
          mode:         'auto',
          synced:       result.synced,
          pending:      result.pending,
          skipped:      result.skipped,
          errors:       result.errors.length,
          errorDetail:  result.errors.length > 0 ? result.errors as unknown as object[] : undefined,
          fetchedCount: result.fetchedCount,
        },
      }).catch((e: unknown) => {
        console.error('[HelpdeskSync] SyncLog write failed:', e instanceof Error ? e.message : e);
      }),
    ]);
  } catch (error) {
    await Promise.allSettled([
      helpdeskCronConfigService.recordRun(null),
      prisma.helpdeskSyncLog.create({ data: { mode: 'auto', errors: 1 } }).catch(() => { /* ignore */ }),
    ]);
    console.error('❌ [HelpdeskSync] Cron lỗi:', error);
  }
}

/** Áp dụng config mới: hủy task cũ, tạo task(s) mới nếu enabled */
function applyConfig(config: CronConfig): void {
  // Dừng cả hai task cũ
  if (_task)  { _task.stop();  _task  = null; }
  if (_task2) { _task2.stop(); _task2 = null; }

  if (!config.enabled && !config.enabled2) {
    console.log('⏸️  [HelpdeskSync] Cron đã tắt');
    return;
  }

  if (config.enabled) {
    const expr = toExpression(config.hour, config.minute);
    _task = cron.schedule(expr, runSync);
    console.log(`✅ [HelpdeskSync] Slot 1: ${expr} (${pad(config.hour)}:${pad(config.minute)} hằng ngày)`);
  }

  if (config.enabled2) {
    const expr2 = toExpression(config.hour2, config.minute2);
    _task2 = cron.schedule(expr2, runSync);
    console.log(`✅ [HelpdeskSync] Slot 2: ${expr2} (${pad(config.hour2)}:${pad(config.minute2)} hằng ngày)`);
  }
}

function pad(n: number) { return String(n).padStart(2, '0'); }

/**
 * Khởi động Helpdesk sync cron.
 * Đọc config từ DB, đăng ký reschedule callback — khi UI lưu lịch mới, cron tự áp dụng ngay.
 */
export function startHelpdeskSyncCron(): void {
  helpdeskCronConfigService.onReschedule((newConfig) => {
    const s1 = newConfig.enabled  ? `${pad(newConfig.hour)}:${pad(newConfig.minute)}`   : 'off';
    const s2 = newConfig.enabled2 ? `${pad(newConfig.hour2)}:${pad(newConfig.minute2)}` : 'off';
    console.log(`🔁 [HelpdeskSync] Reschedule → slot1=${s1} slot2=${s2}`);
    applyConfig(newConfig);
  });

  helpdeskCronConfigService.get()
    .then((config) => { applyConfig(config); })
    .catch((err) => {
      console.error('❌ [HelpdeskSync] Không load được config, dùng mặc định:', err);
      applyConfig(helpdeskCronConfigService.getSync());
    });
}
