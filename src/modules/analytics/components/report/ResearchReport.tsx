'use client';

/**
 * Báo cáo · Research V2 (A3-5) — preview `reports.html?tab=research`. Giữ đúng nội dung V1 `/analytics/research`:
 *  - Việc quá hạn: V1 `GET /api/analytics/overdue?dateFrom=&dateTo=` (lọc theo ngày tạo việc, để trống = tất cả),
 *    tìm theo tiêu đề / người làm + "quá hạn ≥ N ngày" lọc phía máy khách (`filterOverdue`).
 *  - Phân bố khối lượng hiện tại: V1 `GET /api/analytics/workload`.
 * V1 không có link nào tới trang này (giữ nguyên); không xuất tệp.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { StatusDot } from '@/shared/ui/StatusDot';
import { Skeleton } from '@/shared/ui/States';
import { controlClass } from '@/shared/ui/Field';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { useOverdueTasks, useWorkloadBalance } from '../../hooks/useAnalytics';
import type { OverdueTask } from '../../services/research.service';
import { filterOverdue, rangeToggle, todayISO, type Range } from '../../view/report-logic';
import { ReportHead } from './ReportHead';
import { RCard, Donut, Note, Muted, Dot } from './parts';

const WL = ['var(--primary)', 'var(--c-done)', 'var(--c-review)', 'var(--danger)', 'var(--c-approval)', 'var(--c-pickup)', 'var(--c-progress)', 'var(--amber)', 'var(--c-draft)'];
const ctl = cn(controlClass, 'h-[34px] text-[13px] max-[680px]:h-11');

export function ResearchReport({ onOpenTask }: { onOpenTask: (id: string, ids: string[]) => void }) {
  const t = useTranslations();
  const f = useFormat();
  const today = React.useMemo(() => todayISO(), []);
  const [range, setRange] = React.useState<Range>({ dateFrom: '', dateTo: '' });
  const [draft, setDraft] = React.useState<Range>(range);
  const [invalid, setInvalid] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [min, setMin] = React.useState('');
  const overdue = useOverdueTasks({ dateFrom: range.dateFrom || undefined, dateTo: range.dateTo || undefined });
  const workload = useWorkloadBalance();

  const edit = (key: keyof Range, v: string) => {
    const r = rangeToggle(draft, key, v);
    setDraft(r.range);
    setInvalid(r.invalid);
    if (!r.invalid) setRange(r.range);
  };

  const all = overdue.data ?? [];
  const list = filterOverdue(all, q, min);
  const cnt = list.length !== all.length ? `${f.number(list.length)}/${f.number(all.length)}` : f.number(list.length);

  const columns: DataTableColumn<OverdueTask>[] = [
    {
      key: 'task', header: t('tl.colTask'), mobile: 'main',
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-ink max-[680px]:line-clamp-2 max-[680px]:whitespace-normal" title={x.title}>{x.title}</span>
          {x.priority && <small className="flex items-center gap-1.5 text-xs text-ink-3"><Dot color={x.priority.color} className="size-1.5" />{x.priority.name}</small>}
        </span>
      ),
    },
    { key: 'st', header: t('filter.status'), width: '136px', cell: (x) => <StatusDot status={x.status} /> },
    { key: 'due', header: t('filter.due'), width: '96px', cell: (x) => <span className="font-mono text-xs font-medium text-danger">{f.date(x.scheduleEnd)}</span> },
    { key: 'late', header: t('rp.rs.late'), width: '88px', mobile: 'end', cell: (x) => <span className="font-medium tabular-nums text-danger">{t('rp.rs.days', { n: x.daysOverdue })}</span> },
    {
      key: 'who', header: t('filter.assignee'), width: '168px', hideBelow: 'lg', mobile: 'hide',
      cell: (x) => { const s = x.assignees.map((a) => a.user.displayName).join(', '); return <span className="truncate text-[13px] text-ink-2" title={s}>{s || '—'}</span>; },
    },
    { key: 'chev', width: '16px', mobile: 'hide', header: <span className="sr-only">{t('act.open')}</span>, cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  const W = workload.data ?? [];
  const wlTotal = W.reduce((s, x) => s + x.totalActive, 0);

  return (
    <div>
      <ReportHead sub={t('rp.rs.sub')} />
      <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-2" role="search" aria-label={t('rp.rs.f')}>
        <label className="relative min-w-0 flex-[1_1_220px] max-w-[320px] max-[680px]:max-w-none max-[680px]:basis-full">
          <span className="sr-only">{t('rp.rs.q')}</span>
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('rp.rs.q')} className={cn(ctl, 'pl-8')} data-testid="rp-rs-q" />
        </label>
        <label className="sr-only" htmlFor="rp-rs-min">{t('rp.rs.min')}</label>
        <input id="rp-rs-min" type="number" min="0" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder={t('rp.rs.min')}
          className={cn(ctl, 'w-[150px] max-[680px]:w-auto max-[680px]:flex-1')} data-testid="rp-rs-min" />
        <span className="flex min-w-0 items-center gap-1.5 max-[680px]:w-full" title={t('rpx.rs.dates')}>
          <label className="sr-only" htmlFor="rp-rs-a">{t('rp.from')} · {t('rp.rs.created')}</label>
          <input id="rp-rs-a" type="date" value={draft.dateFrom} max={today} onChange={(e) => edit('dateFrom', e.target.value)} aria-invalid={invalid || undefined}
            className={cn(ctl, 'w-[148px] px-2 max-[680px]:w-auto max-[680px]:flex-1')} />
          <span aria-hidden className="text-ink-3">–</span>
          <label className="sr-only" htmlFor="rp-rs-b">{t('rp.to')} · {t('rp.rs.created')}</label>
          <input id="rp-rs-b" type="date" value={draft.dateTo} onChange={(e) => edit('dateTo', e.target.value)} aria-invalid={invalid || undefined}
            className={cn(ctl, 'w-[148px] px-2 max-[680px]:w-auto max-[680px]:flex-1')} />
        </span>
        {invalid && <p role="alert" className="m-0 flex basis-full items-center gap-1.5 text-[13px] text-danger-ink"><AlertCircle aria-hidden className="size-3.5" />{t('rp.err.range')}</p>}
      </div>

      <RCard id="rp-ovT" className="mb-4" testId="rp-overdue"
        title={<>{t('rp.rs.ovT')} <span className="font-mono text-sm font-medium text-ink-3" data-testid="rp-ov-count">({overdue.isLoading ? '…' : cnt})</span></>}>
        <div className="px-4 pb-4 pt-3 max-[680px]:px-3">
          <DataTable
            ariaLabel={t('rp.rs.ovT')}
            columns={columns}
            rows={list}
            getRowId={(x) => x.id}
            loading={overdue.isLoading}
            skeletonRows={5}
            error={overdue.isError ? t('rp.err.d') : undefined}
            onRetry={() => void overdue.refetch()}
            empty={{ icon: CheckCircle2, title: t('rp.rs.none') }}
            onRowClick={(x) => onOpenTask(x.id, list.map((y) => y.id))}
            className="shadow-none"
          />
        </div>
      </RCard>

      <RCard id="rp-wlT" title={t('rp.rs.wlT')} className="mb-4" testId="rp-workload">
        {workload.isLoading ? <div className="grid gap-3 p-4">{[60, 80, 70].map((w) => <Skeleton key={w} variant="line" style={{ width: `${w}%` }} />)}</div> :
         wlTotal === 0 ? <Muted>{t('rp.rs.wlNone')}</Muted> : (
          <>
            <Donut size={148} showPct={false} unit={t('rp.rs.active')} ariaLabel={t('rp.rs.wlT')} testId="rp-wl-donut"
              segs={W.map((x, i) => ({
                key: x.userId, label: x.displayName, value: x.totalActive, color: WL[i % WL.length],
                extra: <small className="ml-1.5 whitespace-nowrap text-xs text-ink-3">{t('rp.rs.wlRow', { a: x.inProgressCount, b: x.pendingCount })}</small>,
              }))} />
            <Note>{t('rp.rs.wlNote')}</Note>
          </>
        )}
      </RCard>
    </div>
  );
}
