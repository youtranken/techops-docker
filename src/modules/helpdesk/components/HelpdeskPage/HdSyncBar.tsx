'use client';

/**
 * Khu đồng bộ cho Boss/Admin (preview helpdesk `.sync`) — gộp toolbar "Get từ API · Lịch tự động · Reset" + "Lịch sử đồng bộ" V1.
 * Dòng trạng thái lấy từ lần đồng bộ gần nhất (GET /sync V1). "Lấy dữ liệu ngay" = POST /sync không body (như "Get từ API").
 */
import { Clock, History, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { CronConfig } from '../../types';
import type { SyncLog } from '../../hooks/useHelpdeskSync';
import { cronTimes, fmtDateTime } from './hd-logic';

export function useCounts() {
  const t = useTranslations();
  return (r: { synced: number; pending: number; skipped: number; errors: number }) =>
    t('hd.res.line', { a: r.synced, b: r.pending, c: r.skipped }) + (r.errors ? ` · ${t('hd.res.err', { n: r.errors })}` : '');
}

export function HdSyncBar({ last, syncing, error, cron, onSync, onCron, onHistory }: {
  last: SyncLog | null; syncing: boolean; error: string | null; cron?: CronConfig;
  onSync: () => void; onCron: () => void; onHistory: () => void;
}) {
  const t = useTranslations();
  const f = useFormat();
  const counts = useCounts();
  const state = syncing ? 'run' : error ? 'bad' : 'ok';
  const times = cronTimes(cron);

  return (
    <section aria-label={t('hd.sync.label')} data-testid="hd-sync"
      className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-card border border-line bg-surface py-2.5 pl-4 pr-3 shadow-v2-1 max-[680px]:p-3">
      <div className="flex min-w-0 flex-[1_1_320px] items-start gap-2.5 max-[680px]:basis-full">
        <span aria-hidden className={cn('mt-[7px] size-2 flex-none rounded-full', state === 'run' && 'animate-pulse motion-reduce:animate-none')}
          style={{ background: state === 'run' ? 'var(--primary)' : state === 'bad' ? 'var(--danger)' : last ? 'var(--c-done)' : 'var(--ink-3)' }} />
        <div className="flex min-w-0 flex-col gap-0.5" role={state === 'bad' ? 'alert' : 'status'}>
          {state === 'run' ? (
            <><b className="text-sm font-semibold text-ink">{t('hd.sync.running')}</b><span className="text-[13px] text-ink-2">{t('hd.sync.runningD')}</span></>
          ) : state === 'bad' ? (
            <><b className="text-sm font-semibold text-danger">{t('hd.sync.failed')}</b><span className="text-[13px] text-ink-2 [overflow-wrap:anywhere]">{error}</span></>
          ) : last ? (
            <>
              <b className="text-sm font-semibold text-ink">{t('hd.sync.last', { t: fmtDateTime(last.ranAt, f.locale), m: t(last.mode === 'auto' ? 'hd.mode.auto' : 'hd.mode.manual') })}</b>
              <span className="text-[13px] text-ink-2">{counts(last)}</span>
            </>
          ) : (
            <><b className="text-sm font-semibold text-ink">{t('hdx.sync.never')}</b><span className="text-[13px] text-ink-2">{t('hd.empty.dBoss')}</span></>
          )}
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1.5 max-[680px]:ml-0 max-[680px]:w-full">
        <Button type="button" variant="subtle" size="xs" onClick={onCron} data-testid="hd-cron-btn" className="max-[680px]:h-11">
          <Clock aria-hidden />{t('hd.cron.short', { t: times.length ? times.join(', ') : t('hd.cron.off') })}
        </Button>
        <Button type="button" variant="subtle" size="xs" onClick={onHistory} data-testid="hd-hist-btn" className="max-[680px]:h-11">
          <History aria-hidden />{t('hd.hist.btn')}
        </Button>
        <Button type="button" size="xs" onClick={onSync} disabled={syncing} data-testid="hd-sync-btn" className="max-[680px]:ml-auto max-[680px]:h-11">
          <RefreshCw aria-hidden className={cn(syncing && 'animate-spin motion-reduce:animate-none')} />
          {t(syncing ? 'hd.sync.btnRun' : error ? 'app.retry' : 'hd.sync.btn')}
        </Button>
      </div>
    </section>
  );
}
