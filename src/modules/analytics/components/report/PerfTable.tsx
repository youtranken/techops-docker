'use client';

/**
 * Hiệu suất theo người (preview `.perf`) — dữ liệu V1 `GET /api/analytics/performance` (chỉ nhân viên, không gồm việc đã hủy).
 * Sắp xếp phía máy khách (bấm tiêu đề cột / ô chọn ở mobile). Bấm dòng → Danh sách công việc của người đó (link V1).
 * V1 cắt 15 dòng đầu; V2 hiện đủ (cùng dữ liệu API).
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { UserPerformance } from '../../services/analytics.service';
import { completionPct, perfHref, type Range } from '../../view/report-logic';
import { selectCls } from './period';

type K = 'name' | 'totalAssigned' | 'tasksCompleted' | 'onTimeRate' | 'inProgress' | 'overdueCount' | 'rejectionCount' | 'transferredCount';
const COLS: { k: Exclude<K, 'name'>; label: string; w: string; hide?: 'md' | 'lg' }[] = [
  { k: 'totalAssigned', label: 'rp.p.total', w: '64px' },
  { k: 'tasksCompleted', label: 'rp.p.done', w: '128px' },
  { k: 'onTimeRate', label: 'rp.p.ontime', w: '72px' },
  { k: 'inProgress', label: 'rp.p.prog', w: '64px' },
  { k: 'overdueCount', label: 'rp.p.over', w: '64px' },
  { k: 'rejectionCount', label: 'rp.p.rej', w: '64px', hide: 'md' },
  { k: 'transferredCount', label: 'rp.p.trans', w: '80px', hide: 'md' },
];

export function PerfTable({ rows, loading, error, onRetry, range }: {
  rows: UserPerformance[]; loading: boolean; error: boolean; onRetry: () => void; range: Range;
}) {
  const t = useTranslations();
  const f = useFormat();
  const router = useRouter();
  const [sort, setSort] = React.useState<{ k: K; dir: 1 | -1 }>({ k: 'tasksCompleted', dir: -1 });

  const sorted = React.useMemo(() => {
    const byName = (a: UserPerformance, b: UserPerformance) => a.displayName.localeCompare(b.displayName, 'vi');
    return [...rows].sort((a, b) => sort.k === 'name' ? byName(a, b) * sort.dir : ((a[sort.k] - b[sort.k]) * sort.dir || byName(a, b)));
  }, [rows, sort]);

  const setK = (k: K) => setSort((s) => (s.k === k ? { k, dir: (-s.dir) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }));
  const head = (k: K, label: string, end?: boolean) => {
    const on = sort.k === k;
    return (
      <button type="button" onClick={() => setK(k)} aria-label={t('tl.sortBy', { c: label })}
        className={cn('inline-flex items-center gap-1 whitespace-normal rounded text-left leading-tight hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', end && 'flex-row-reverse text-right', on && 'font-medium text-ink')}>
        {label}
        <ChevronDown aria-hidden className={cn('size-3 flex-none', !on && 'opacity-0', on && sort.dir > 0 && 'rotate-180')} />
      </button>
    );
  };
  const ariaSort = (k: K) => ({ 'aria-sort': sort.k === k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none' } as React.HTMLAttributes<HTMLDivElement>);
  const ml = (label: string) => <span className="mr-1 hidden whitespace-nowrap text-xs text-ink-3 max-[680px]:inline">{label}</span>;
  const num = (v: number, bad?: boolean) => (
    <span className={cn('font-mono text-[13px] tabular-nums max-[680px]:text-xs', v === 0 ? 'text-ink-3' : bad ? 'font-medium text-danger' : 'text-ink')}>{f.number(v)}</span>
  );

  const columns: DataTableColumn<UserPerformance>[] = [
    {
      key: 'name', header: head('name', t('filter.assignee')), headerProps: ariaSort('name'), mobile: 'main',
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <UserAvatar displayName={u.displayName} size="md" />
          <span className="min-w-0 truncate font-medium text-ink">{u.displayName}</span>
        </span>
      ),
    },
    ...COLS.map((c): DataTableColumn<UserPerformance> => ({
      key: c.k, width: c.w, align: 'end', hideBelow: c.hide, headerProps: ariaSort(c.k),
      header: head(c.k, t(c.label), true),
      className: 'max-[680px]:!justify-start max-[680px]:basis-[calc((100%-28px)/3)]',
      cell: (u) => {
        const label = t(c.label);
        if (c.k === 'tasksCompleted') {
          const p = completionPct(u.tasksCompleted, u.totalAssigned);
          return (
            <span className="flex items-center gap-2" title={t('rp.p.rateOf', { p: `${p}%` })}>
              {ml(label)}{num(u.tasksCompleted)}
              <span aria-hidden className="h-1 w-10 overflow-hidden rounded-sm bg-surface-2 max-[1199px]:hidden"><i className="block h-full rounded-sm bg-[var(--c-done)]" style={{ width: `${p}%` }} /></span>
              <span className="min-w-[34px] text-right font-mono text-xs text-ink-3">{p}%</span>
            </span>
          );
        }
        if (c.k === 'onTimeRate') return <span title={t('rpx.p.ontimeT')}>{ml(label)}<span className="font-mono text-[13px] text-ink max-[680px]:text-xs">{u.onTimeRate}%</span></span>;
        return <span>{ml(label)}{num(u[c.k], c.k === 'overdueCount')}</span>;
      },
    })),
    { key: 'chev', width: '16px', mobile: 'hide', header: <span className="sr-only">{t('act.open')}</span>, cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  return (
    <section aria-labelledby="rp-pT" className="mb-4" data-testid="rp-perf">
      <div className="mb-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="rp-pT" className="m-0 font-head text-base font-semibold leading-[1.3] text-ink">{t('rp.p.title')}</h2>
          <p className="m-0 mt-0.5 text-[13px] text-ink-3">{t('rpx.p.sub')}</p>
        </div>
        <span className="ml-auto hidden max-[680px]:flex">
          <label className="sr-only" htmlFor="rp-psort">{t('rp.p.sort')}</label>
          <select id="rp-psort" className={selectCls} value={sort.k} onChange={(e) => { const k = e.target.value as K; setSort({ k, dir: k === 'name' ? 1 : -1 }); }}>
            <option value="name">{t('filter.assignee')}</option>
            {COLS.map((c) => <option key={c.k} value={c.k}>{t(c.label)}</option>)}
          </select>
        </span>
      </div>
      <DataTable
        ariaLabel={t('rp.p.title')}
        columns={columns}
        rows={sorted}
        getRowId={(u) => u.userId}
        loading={loading}
        skeletonRows={5}
        error={error ? t('rp.err.d') : undefined}
        onRetry={onRetry}
        empty={{ title: t('rp.p.empty') }}
        onRowClick={(u) => router.push(perfHref(u.userId, range))}
        className="[&_.v2-th]:whitespace-normal [&_.v2-thead]:h-auto [&_.v2-thead]:min-h-10 [&_.v2-thead]:py-1.5"
      />
    </section>
  );
}
