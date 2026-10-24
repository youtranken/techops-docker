'use client';

/**
 * 6 ô KPI (preview `.kpis .kpi`). Số + công thức = V1 (`kpiCards`): chênh lệch so với kỳ trước chỉ hiện khi ≠ 0,
 * tăng luôn xanh / giảm luôn đỏ như V1. 5 ô bấm được → danh sách (drill-down V1); ô Gia hạn không có danh sách.
 */
import { useLocale, useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { useFormat } from '@/i18n/useFormat';
import { resolveLocale } from '@/i18n/locale';
import { cn } from '@/lib/utils';
import { pctText, type KpiCardVm, type KpiKey } from '../../view/report-logic';
import { Dot } from './parts';

const COLOR: Record<KpiKey, string> = {
  total: 'var(--ink-3)', done: 'var(--c-done)', prog: 'var(--c-progress)', wait: 'var(--c-review)', over: 'var(--danger)', ext: 'var(--amber)',
};

export function KpiGrid({ cards, onDrill }: { cards: KpiCardVm[]; onDrill: (c: KpiCardVm) => void }) {
  const t = useTranslations();
  const f = useFormat();
  const locale = resolveLocale(useLocale());

  const sub = (c: KpiCardVm) => {
    if (c.key === 'done') return t('rp.k.rate', { p: pctText(c.rate ?? 0, locale, 1, 1) });
    if (c.key === 'wait') return t('rp.k.waitSub', { a: f.number(c.waitAck ?? 0), b: f.number(c.waitReview ?? 0) });
    if (c.key === 'over') return t('rp.k.overSub');
    if (c.key === 'ext') return t(c.warn ? 'rp.k.extWarn' : 'rp.k.extSub', { p: pctText(c.extRate ?? 0, locale) });
    return null;
  };

  return (
    <section aria-label="KPI" className="mb-4 grid grid-cols-6 gap-3 max-[1199px]:grid-cols-3 max-[680px]:grid-cols-2 max-[680px]:gap-2.5" data-testid="rp-kpis">
      {cards.map((c) => {
        const label = t(`rp.k.${c.key}`);
        const s = sub(c);
        const d = c.delta;
        const body = (
          <>
            <span className="flex w-full min-w-0 items-center gap-[7px] text-[13px] text-ink-2">
              <Dot color={COLOR[c.key]} />
              <span className="min-w-0 truncate">{label}</span>
              {c.drill && <ChevronRight aria-hidden className="absolute right-2.5 top-2.5 size-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 max-[680px]:hidden" />}
            </span>
            <span className="mt-0.5 font-head text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink tabular-nums max-[680px]:text-2xl" data-testid={`rp-kpi-${c.key}-v`}>
              {f.number(c.value)}
            </span>
            {c.key === 'done' && (
              <span aria-hidden className="mb-px mt-[3px] block h-[3px] w-full overflow-hidden rounded-sm bg-surface-2">
                <i className="block h-full rounded-sm bg-[var(--c-done)]" style={{ width: `${Math.min(100, c.rate ?? 0)}%` }} />
              </span>
            )}
            {s && <span className={cn('text-xs leading-[1.4] text-ink-3', c.warn && 'font-medium text-[var(--c-review)]')}>{s}</span>}
            {d !== undefined && d !== 0 && (
              <span className={cn('mt-auto inline-flex items-center gap-[3px] pt-1 font-mono text-xs font-medium', d > 0 ? 'text-[var(--c-done)]' : 'text-danger')}
                title={t('rp.k.vs', { d: `${d > 0 ? '+' : '−'}${f.number(Math.abs(d))}`, v: f.number(c.prev ?? 0) })} data-testid={`rp-kpi-${c.key}-d`}>
                {d > 0 ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />}
                <span aria-hidden>{d > 0 ? '+' : '−'}{f.number(Math.abs(d))}</span>
                <span className="sr-only">{t('rp.k.vs', { d: `${d > 0 ? '+' : '−'}${f.number(Math.abs(d))}`, v: f.number(c.prev ?? 0) })}</span>
              </span>
            )}
          </>
        );
        const cls = 'group relative flex min-w-0 flex-col items-start gap-1 rounded-card border border-line bg-surface px-4 py-3.5 text-left shadow-v2-1 max-[680px]:px-3.5 max-[680px]:py-3';
        return c.drill ? (
          <button key={c.key} type="button" aria-haspopup="dialog" title={t('rp.k.open', { k: label })} data-kpi={c.key} onClick={() => onDrill(c)}
            className={cn(cls, 'hover:border-line-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
            {body}
          </button>
        ) : (
          <div key={c.key} className={cls} title={t('rp.k.noDrill')} data-kpi={c.key}>{body}</div>
        );
      })}
    </section>
  );
}
