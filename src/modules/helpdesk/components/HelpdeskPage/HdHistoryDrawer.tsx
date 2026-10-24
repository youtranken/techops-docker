'use client';

/** Ngăn "Lịch sử đồng bộ" (preview `histHtml`, V1 SyncHistorySection): 5 lần gần nhất, bấm "n lỗi" để xem chi tiết. */
import * as React from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ErrorState, Skeleton } from '@/shared/ui/States';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { SyncLog } from '../../hooks/useHelpdeskSync';
import { fmtDateTime } from './hd-logic';

const iconBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function HdHistoryDrawer({ open, logs, loading, error, onRetry, onClose }: {
  open: boolean; logs?: SyncLog[]; loading: boolean; error: boolean; onRetry: () => void; onClose: () => void;
}) {
  const t = useTranslations();
  const f = useFormat();
  const [openErr, setOpenErr] = React.useState<Set<string>>(new Set());
  const list = (logs ?? []).slice(0, 5);
  const toggle = (id: string) => setOpenErr((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" aria-describedby={undefined} data-testid="hd-hist"
        className="v2-drawer flex w-full flex-col gap-0 border-0 bg-surface p-0 sm:max-w-[480px] max-[680px]:max-w-none">
        <header className="flex h-14 flex-none items-center gap-1 border-b border-line pl-4 pr-3 max-[680px]:pl-3 max-[680px]:pr-2">
          <button type="button" onClick={onClose} className="-ml-1.5 hidden h-11 items-center gap-1 rounded-md pl-1 pr-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink max-[680px]:inline-flex">
            <ChevronLeft aria-hidden className="size-5" />{t('td.back')}
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className={`${iconBtn} max-[680px]:hidden`} aria-label={t('app.close')}><X aria-hidden className="size-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-5 max-[680px]:px-4">
          <SheetTitle className="m-0 font-head text-lg font-semibold text-ink">{t('hd.hist.title')}</SheetTitle>
          <p className="mb-5 mt-1 text-[13px] text-ink-3">{t('hd.hist.sub')}</p>
          {loading ? (
            <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} variant="block" className="h-12" />)}</div>
          ) : error ? (
            <ErrorState description={t('hdx.hist.loadErr')} onRetry={onRetry} />
          ) : !list.length ? (
            <p className="text-sm text-ink-3">{t('hd.hist.empty')}</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {list.map((h) => {
                const shown = openErr.has(h.id);
                return (
                  <li key={h.id} className="border-b border-line py-3.5 first:pt-0 last:border-b-0" data-testid="hd-hist-item">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span aria-hidden className="size-2 flex-none rounded-full" style={{ background: h.mode === 'auto' ? 'var(--c-progress)' : 'var(--c-approval)' }} />
                      <b className="font-semibold text-ink">{t(h.mode === 'auto' ? 'hd.mode.auto' : 'hd.mode.manual')}</b>
                      <span className="ml-auto font-mono text-xs text-ink-2">{fmtDateTime(h.ranAt, f.locale)}</span>
                    </div>
                    <p className="m-0 ml-4 mt-1 text-[13px] text-ink-2">
                      {t('hd.hist.line', { a: h.synced, b: h.pending, c: h.skipped, f: h.fetchedCount })}
                    </p>
                    {h.errors > 0 && (
                      <div className="ml-2.5 mt-1.5">
                        <button type="button" onClick={() => toggle(h.id)} aria-expanded={shown} aria-controls={`hd-he-${h.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-medium text-danger hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <AlertCircle aria-hidden className="size-3.5" />{t('hd.res.err', { n: h.errors })}
                          <ChevronRight aria-hidden className={cn('size-3.5 transition-transform', shown && 'rotate-90')} />
                        </button>
                        {shown && (
                          <ul id={`hd-he-${h.id}`} className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0 pl-1.5">
                            {(h.errorDetail ?? []).map((e, i) => (
                              <li key={i} className="rounded-sm bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2 [overflow-wrap:anywhere]">
                                <span className="font-mono text-ink">{e.hdId ?? e.code ?? '?'}</span> — {e.message}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
