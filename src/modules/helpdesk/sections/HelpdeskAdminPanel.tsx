'use client';

import { useState } from 'react';
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHelpdeskSync } from '../hooks/useHelpdeskSync';
import { useHelpdeskCronConfig } from '../hooks/useHelpdeskCronConfig';
import { CronPanel } from '../components/admin/CronPanel';
import { SyncHistorySection } from './SyncHistorySection';

function pad(n: number) { return String(n).padStart(2, '0'); }

/** Panel dành riêng cho BOSS / ADMIN — Get API + Lịch tự động */
export function HelpdeskAdminPanel() {
  const { mutate: runSync, isLoading: isSyncing, data: syncResult, error: syncError } = useHelpdeskSync();
  const { config, isLoading: loadingCron } = useHelpdeskCronConfig();
  const [showCron, setShowCron] = useState(false);

  const cronLabel = !loadingCron && config
    ? (config.enabled ? `${pad(config.hour)}:${pad(config.minute)}` : 'Tắt')
    : '...';

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-xl overflow-hidden">

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          <Button onClick={() => runSync()} disabled={isSyncing} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Đang lấy...' : 'Get từ API'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowCron(!showCron)}
            className={cn('gap-2', showCron && 'bg-muted')}
          >
            <Clock className="h-4 w-4" />
            Lịch tự động
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium ml-1',
              config?.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-muted text-muted-foreground',
            )}>
              {cronLabel}
            </span>
          </Button>
        </div>

        {/* ── Feedback ─────────────────────────────────────────────────── */}
        {(syncResult ?? syncError) && (
          <div className="px-5 pb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs border-t border-border pt-3">
            {syncResult && !isSyncing && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                Lấy xong:{' '}
                <span className="text-green-600 font-medium">{syncResult.synced} task mới</span>
                {' · '}<span className="text-amber-500 font-medium">{syncResult.pending} chờ gán</span>
                {' · '}<span className="text-muted-foreground/60">{syncResult.skipped} bỏ qua</span>
                {syncResult.errors.length > 0 && <> · <span className="text-destructive font-medium">{syncResult.errors.length} lỗi</span></>}
              </span>
            )}
            {syncError && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Lỗi: {syncError.message}
              </span>
            )}
          </div>
        )}

        {/* ── Cron panel (collapsible) ─────────────────────────────────── */}
        {showCron && <CronPanel />}
      </div>

      {/* ── Sync history ─────────────────────────────────────────────── */}
      <SyncHistorySection />
    </div>
  );
}
