'use client';

/**
 * Danh sách sau ô KPI (preview `openDrill`): hộp thoại lớn, 10 dòng/trang phía máy khách, bấm dòng → ngăn chi tiết việc.
 * Dữ liệu V1 (`/api/analytics/drilldown`, tối đa 100). "Hoàn thành" lọc theo ngày xong (V1) — ghi rõ ở dòng phụ.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { StatusDot } from '@/shared/ui/StatusDot';
import { useFormat } from '@/i18n/useFormat';
import type { DrillDownTask } from '@/app/api/analytics/drilldown/route';
import { useDrillDown } from '../../hooks/useDrillDown';
import type { KpiKey, Range, DrillType } from '../../view/report-logic';

const PS = 10;
const navBtn = 'grid size-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:size-11';

export function DrillDialog({ open, onClose, range, periodLabel, onOpenTask }: {
  open: { key: KpiKey; type: DrillType } | null;
  onClose: () => void;
  range: Range;
  periodLabel: string;
  onOpenTask: (id: string, ids: string[]) => void;
}) {
  const t = useTranslations();
  const f = useFormat();
  const q = useDrillDown(open?.type ?? null, range);
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [open?.type]);
  const list = q.data?.data ?? [];
  const pages = Math.max(1, Math.ceil(list.length / PS));
  const rows = list.slice(page * PS, page * PS + PS);

  const columns: DataTableColumn<DrillDownTask>[] = [
    {
      key: 'task', header: t('tl.colTask'), mobile: 'main',
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-ink max-[680px]:line-clamp-2 max-[680px]:whitespace-normal">{x.title}</span>
          {x.taskCode && <span className="font-mono text-xs text-ink-3">{x.taskCode}</span>}
        </span>
      ),
    },
    {
      key: 'who', header: t('filter.assignee'), width: '150px', hideBelow: 'md',
      cell: (x) => <span className="truncate text-[13px] text-ink-2" title={x.assigneeNames.join(', ')}>{x.assigneeNames.join(', ') || <span className="text-ink-3">{t('card.unassigned')}</span>}</span>,
    },
    { key: 'st', header: t('filter.status'), width: '132px', cell: (x) => <StatusDot status={x.status} /> },
    {
      key: 'due', header: t('filter.due'), width: '104px', mobile: 'end',
      cell: (x) => x.scheduleEnd ? (
        <span className="flex flex-col whitespace-nowrap text-[13px] text-ink-2 max-[680px]:flex-row max-[680px]:gap-1.5">
          <span className="font-mono text-xs">{f.date(x.scheduleEnd)}</span>
          {x.daysOverdue !== undefined && x.daysOverdue > 0 && <small className="text-xs text-danger">{t('rp.dd.over', { n: x.daysOverdue })}</small>}
        </span>
      ) : <span className="text-[13px] text-ink-3">{t('due.none')}</span>,
    },
  ];

  const sub = open
    ? `${t(open.key === 'done' ? 'rp.dd.subDone' : 'rp.dd.sub', { n: f.number(list.length), p: periodLabel })}${(q.data?.total ?? 0) >= 100 ? ` · ${t('rpx.dd.max')}` : ''}`
    : '';

  return (
    <ActionDialog open={open !== null} onClose={onClose} size="lg" title={open ? t(`rp.k.${open.key}`) : ''} sub={q.isLoading ? undefined : sub} data-testid="rp-drill">
      {list.length > 0 && <p className="!mb-2.5 text-xs text-ink-3">{t('rp.dd.hint')}</p>}
      <DataTable
        ariaLabel={open ? t(`rp.k.${open.key}`) : ''}
        columns={columns}
        rows={rows}
        getRowId={(x) => x.id}
        loading={q.isLoading}
        skeletonRows={5}
        error={q.isError ? t('rp.err.d') : undefined}
        onRetry={() => void q.refetch()}
        empty={{ title: t('rp.empty._'), icon: Inbox }}
        onRowClick={(x) => onOpenTask(x.id, list.map((y) => y.id))}
        className="shadow-none"
      />
      {pages > 1 && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-3">
          <span>{t('rp.dd.page', { a: page + 1, b: pages })}</span>
          <span className="ml-auto flex items-center gap-0.5" role="group" aria-label={t('rp.l.pages')}>
            <button type="button" className={navBtn} aria-label={t('rp.dd.prev')} disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft aria-hidden className="size-4" /></button>
            <button type="button" className={navBtn} aria-label={t('rp.dd.next')} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight aria-hidden className="size-4" /></button>
          </span>
        </div>
      )}
    </ActionDialog>
  );
}
