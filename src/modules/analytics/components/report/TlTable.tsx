'use client';

/**
 * Bảng Danh sách công việc (preview `.rt`): mỗi dòng = một người được giao trong một việc (V1 `TaskListRow`).
 * Cột sắp xếp được gửi lên API như V1 (`sortBy`/`sortOrder`, bấm lại cùng cột thì đảo chiều — `nextSort`).
 * Cột Người làm ẩn khi đang lọc một người (V1). "Ngày nhận" = ngày nhận việc hoặc ngày tạo (V1 `receivedAt`; user chốt đổi nhãn 24/10).
 */
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { StatusDot } from '@/shared/ui/StatusDot';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import type { TaskListRow } from '../../services/analytics.service';
import { nextSort, type SortOrder, type TaskListState } from '../../view/report-logic';
import { Dot } from './parts';

export function TlTable({ s, rows, loading, error, onRetry, noneInPeriod, onSort, onOpenTask }: {
  s: TaskListState; rows: TaskListRow[]; loading: boolean; error: boolean; onRetry: () => void; noneInPeriod: boolean;
  onSort: (by: string, ord: SortOrder) => void; onOpenTask: (id: string, ids: string[]) => void;
}) {
  const t = useTranslations();
  const f = useFormat();
  const ml = (l: string) => <span className="mr-1 hidden font-body text-xs text-ink-3 max-[680px]:inline">{l}</span>;

  const head = (field: string, label: string) => {
    const on = s.sortBy === field;
    return {
      header: (
        <button type="button" aria-label={t('tl.sortBy', { c: label })} onClick={() => { const n = nextSort(s.sortBy, s.sortOrder, field); onSort(n.sortBy, n.sortOrder); }}
          className={cn('inline-flex items-center gap-1 rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', on && 'font-medium text-ink')}>
          {label}<ChevronDown aria-hidden className={cn('size-3', !on && 'opacity-0', on && s.sortOrder === 'asc' && 'rotate-180')} />
        </button>
      ),
      headerProps: { 'aria-sort': on ? (s.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none' } as React.HTMLAttributes<HTMLDivElement>,
    };
  };

  const ot = (r: TaskListRow) => {
    if (r.isOverdue) return <span className="inline-flex items-center gap-2 text-[13px] font-medium text-danger"><Dot color="var(--danger)" />{t('rp.ot.over')}</span>;
    if (r.isOnTime === true) return <span className="inline-flex items-center gap-2 text-[13px] text-ink-2"><Dot color="var(--c-done)" />{t('rp.ot.on')}</span>;
    if (r.isOnTime === false) return <span className="inline-flex items-center gap-2 text-[13px] text-ink-2"><Dot color="var(--danger)" />{t('rp.ot.late')}</span>;
    return <span className="text-[13px] text-ink-3">{t('rp.ot.none')}</span>;
  };

  const columns: DataTableColumn<TaskListRow>[] = [
    {
      key: 'task', ...head('title', t('tl.colTask')), mobile: 'main', mobileOrder: 0,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium leading-5 text-ink max-[680px]:line-clamp-2 max-[680px]:whitespace-normal" title={r.taskTitle}>{r.taskTitle}</span>
          <span className="truncate text-xs text-ink-3">
            {r.taskCode && <span className="font-mono">{r.taskCode} · </span>}{r.taskType}
            <span className="hidden max-[1100px]:inline"> · {t('rpx.l.received', { d: f.date(r.receivedAt) })}</span>
          </span>
        </span>
      ),
    },
    ...(s.userId ? [] : [{
      key: 'who', header: t('filter.assignee'), width: '150px', mobile: 'main' as const, mobileOrder: 1,
      cell: (r: TaskListRow) => (
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-2">
          <UserAvatar displayName={r.displayName} size="xs" /><span className="truncate">{r.displayName}</span>
        </span>
      ),
    }]),
    { key: 'cr', ...head('createdAt', t('rpx.c.received')), width: '96px', hideBelow: 'lg', mobile: 'hide', cell: (r) => <span className="font-mono text-xs text-ink-2">{f.date(r.receivedAt)}</span> },
    {
      key: 'due', ...head('scheduleEnd', t('filter.due')), width: '96px', mobileOrder: 2,
      cell: (r) => <span className={cn('whitespace-nowrap font-mono text-xs', r.isOverdue ? 'font-medium text-danger' : 'text-ink-2')}>{ml(t('filter.due'))}{f.date(r.scheduleEnd)}</span>,
    },
    {
      key: 'done', header: t('rp.c.doneAt'), width: '144px', mobileOrder: 3,
      cell: (r) => r.completedAt ? (
        <span className="whitespace-nowrap font-mono text-xs text-ink-2">
          {ml(t('rp.c.doneAt'))}{f.date(r.completedAt)}
          {r.processingDays !== null && <small className="font-body text-xs text-ink-3"> · {r.processingDays === 1 ? t('rp.day1') : t('rp.days', { n: r.processingDays })}</small>}
        </span>
      ) : <span className="text-ink-3 max-[680px]:hidden">—</span>,
    },
    { key: 'ot', header: t('rp.c.ontime'), width: '104px', mobileOrder: 4, cell: ot },
    { key: 'st', ...head('status', t('filter.status')), width: '136px', mobile: 'end', mobileOrder: 5, cell: (r) => <StatusDot kind="assignee" status={r.status} /> },
    { key: 'chev', width: '16px', mobile: 'hide', header: <span className="sr-only">{t('act.open')}</span>, cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  const ids = Array.from(new Set(rows.map((r) => r.taskId)));
  return (
    <DataTable
      ariaLabel={t('rp.tab.tasks')}
      columns={columns}
      rows={rows}
      getRowId={(r) => r.assigneeId}
      loading={loading}
      skeletonRows={8}
      error={error ? t('rp.err.d') : undefined}
      onRetry={onRetry}
      empty={noneInPeriod ? { icon: Inbox, title: t('rp.empty.t'), description: t('rp.empty.d') } : { icon: Inbox, title: t('rp.l.empty.t'), description: t('rp.l.empty.d') }}
      onRowClick={(r) => onOpenTask(r.taskId, ids)}
      data-testid="rp-tl-table"
    />
  );
}
