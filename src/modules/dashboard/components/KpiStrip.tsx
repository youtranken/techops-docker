'use client';

/** Hàng chỉ số (preview `.kpis`): 1 khối, 6 ô kẻ 1px; 6 → 3 (≤1199) → 2 cột (≤680). Số liệu V1, ô 3–4 theo vai trò. */
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { taskStatusMeta } from '@/shared/ui/status-meta';
import { useFormat } from '@/i18n/useFormat';
import type { Kpi } from '../view-model/dashboard-logic';

const LABEL: Record<Kpi['key'], string> = {
  total: 'db.k.total', done: 'db.k.done', approval: 'st.PENDING_APPROVAL', review: 'st.PENDING_REVIEW',
  myProg: 'db.k.myProg', myAck: 'db.k.myAck', overdue: 'db.k.overdue', sla: 'db.k.sla',
};
const SUB: Record<Kpi['key'], string> = {
  total: 'db.k.totalSub', done: 'db.k.rate', approval: 'db.k.apSub', review: 'db.k.rvSub',
  myProg: 'db.k.myProgSub', myAck: 'db.k.myAckSub', overdue: 'db.k.overSub', sla: 'db.k.slaSub',
};
const SLA_COLOR = { good: 'var(--c-done)', warn: 'var(--c-review)', bad: 'var(--danger)', none: 'var(--line)' } as const;
const fix1 = (locale: string, n: number) =>
  n.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function KpiStrip({ kpis }: { kpis: Kpi[] }) {
  const t = useTranslations();
  const f = useFormat();
  return (
    <section aria-label={t('db.k.label')} className="v2-db-kpis mb-4 grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-v2-1">
      {kpis.map((k) => {
        const value = k.value === null ? '—' : k.key === 'sla' ? `${fix1(f.locale, k.value)}%` : f.number(k.value);
        const sub = k.key === 'done' ? t(SUB.done, { n: fix1(f.locale, k.rate ?? 0) }) : t(SUB[k.key]);
        const color = k.key === 'sla' ? SLA_COLOR[k.tone ?? 'none'] : 'var(--primary-text)';
        return (
          <div key={k.key} data-kpi={k.key} className="flex min-w-0 flex-col bg-surface px-4 pb-4 pt-3.5 max-[680px]:px-3.5 max-[680px]:pb-3.5 max-[680px]:pt-3">
            <div className="flex min-w-0 items-center gap-[7px] text-xs font-medium text-ink-2">
              {k.status && <span aria-hidden className="size-2 flex-none rounded-full" style={{ background: taskStatusMeta(k.status).color }} />}
              <span className="truncate">{t(LABEL[k.key])}</span>
            </div>
            <div data-testid={`kpi-${k.key}`} className={cn('mt-2 font-head text-[26px] font-semibold leading-[1.15] tracking-[-.01em] tabular-nums max-[680px]:mt-1.5 max-[680px]:text-[22px]', k.bad ? 'text-danger' : 'text-ink')}>
              {value}
            </div>
            <div className="mt-1 text-xs leading-[1.4] text-ink-3">{sub}</div>
            {k.bar !== undefined && (
              <div className="mt-auto pt-2.5">
                <div role="presentation" className="h-1 overflow-hidden rounded-pill bg-surface-2">
                  <i className="block h-full rounded-[inherit]" style={{ width: `${Math.max(0, Math.min(100, k.bar))}%`, background: color }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
