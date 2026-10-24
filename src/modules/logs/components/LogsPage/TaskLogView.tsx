'use client';

/**
 * Tab "Công việc" (/logs/task-activity) — preview logs.html tab task. Nghiệp vụ giữ V1:
 * - Lọc: tiêu đề công việc (`taskTitle`, V1 chỉ tìm theo tiêu đề — không theo mã), khoảng ngày, người thực hiện, hành động
 *   (đúng 20 giá trị V1, nhóm theo preview). 20 dòng/trang. URL gửi API giống hệt V1 (`taskLogUrl`).
 * - Phạm vi xem do API V1 quyết định (nhân viên: chỉ việc mình tạo/được giao; API bỏ qua lọc người thực hiện).
 * - `?taskTitle=` trên URL (từ "Xem nhật ký việc này") điền sẵn ô tìm.
 */
import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Filter } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { Pagination } from '@/shared/ui/Pagination';
import { useFormat } from '@/i18n/useFormat';
import type { TaskLogEntry, TaskLogFilters } from '../../types';
import { useTaskAuditLogs } from '../../hooks/useTaskAuditLogs';
import { useLogUserList } from '../../hooks/useLogUserList';
import {
  LOG_PAGE_SIZE, TASK_ACTION_GROUPS, TASK_FILTER_ACTIONS, groupActions, startsNewDay, taskActionKey, taskChanges, taskGroup, timeHM,
} from '../../view/log-logic';
import { ActionMark, ClearFilters, DayHeading, FilterBar, LogDates, LogMeta, LogSearch, LogSelect, Person, useMsg } from './LogParts';
import { TaskEventDrawer } from './LogDrawers';

const BASE: TaskLogFilters = { page: 1, limit: LOG_PAGE_SIZE };

function Summary({ items, render }: { items: ReturnType<typeof taskChanges>['summary']; render: ReturnType<typeof useMsg> }) {
  const t = useTranslations();
  if (!items.length) return <span className="text-ink-3">—</span>;
  const more = items.length - 1;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate" title={items.map(render).join(' · ')}>{render(items[0])}</span>
      {more > 0 && (
        <span className="flex-none rounded border border-line px-1 py-0.5 font-mono text-[11px] leading-none text-ink-3" title={t('lg.chg.moreSr', { n: more })}>
          <span aria-hidden>{t('lg.chg.more', { n: more })}</span><span className="sr-only">{t('lg.chg.moreSr', { n: more })}</span>
        </span>
      )}
    </span>
  );
}

export function TaskLogView() {
  const t = useTranslations();
  const f = useFormat();
  const render = useMsg();
  const sp = useSearchParams();
  const [filters, setFilters] = React.useState<TaskLogFilters>(() => ({ ...BASE, taskTitle: sp.get('taskTitle') || undefined }));
  const [open, setOpen] = React.useState<TaskLogEntry | null>(null);
  const q = useTaskAuditLogs(filters);
  const { data: users = [] } = useLogUserList();
  const nameOf = React.useCallback((id: string) => users.find((u) => u.id === id)?.displayName, [users]);

  const rows = q.data?.data ?? [];
  const total = q.data?.pagination.total;
  const set = (patch: Partial<TaskLogFilters>) => setFilters((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  const onSearch = React.useCallback((v: string) => setFilters((p) => ({ ...p, taskTitle: v || undefined, page: 1 })), []);
  const filtered = !!(filters.taskTitle || filters.userId || filters.action || filters.dateFrom || filters.dateTo);

  const columns: DataTableColumn<TaskLogEntry>[] = [
    { key: 'time', header: t('lg.col.time'), width: '52px', mobile: 'end', mobileOrder: 2,
      cell: (l) => <time dateTime={l.createdAt} className="font-mono text-[13px] text-ink-2">{timeHM(l.createdAt)}</time> },
    { key: 'who', header: t('lg.col.who'), width: '160px', mobileOrder: 4, className: 'max-[680px]:max-w-[45%] max-[680px]:text-xs',
      cell: (l) => <Person name={l.performedBy.displayName} size="xs" /> },
    { key: 'act', header: t('lg.col.act'), width: '180px', mobileOrder: 1, className: 'max-[680px]:flex-1',
      cell: (l) => { const k = taskActionKey(l); return <ActionMark group={taskGroup(l.action)} label={k ? t(k as never) : l.action} />; } },
    { key: 'obj', header: t('lg.col.obj'), mobile: 'main', mobileOrder: 3,
      cell: (l) => (
        <span className="flex min-w-0 flex-col gap-0.5 py-1.5 max-[680px]:py-0">
          <span className="flex min-w-0 items-baseline gap-2">
            {l.task?.taskCode && <span className="flex-none font-mono text-xs font-medium text-ink-2">{l.task.taskCode}</span>}
            <span className="truncate text-sm text-ink-2" title={l.task?.title}>{l.task ? l.task.title : <span className="text-ink-3">{t('lg.deleted')}</span>}</span>
          </span>
          <span className="hidden min-w-0 text-xs text-ink-3 max-[1100px]:flex max-[680px]:hidden">
            <Summary items={taskChanges(l, nameOf).summary} render={render} />
          </span>
        </span>
      ) },
    { key: 'chg', header: t('lg.col.chg'), width: 'minmax(0,.85fr)', hideBelow: 'lg', mobileOrder: 5,
      className: 'text-sm text-ink-2 max-[680px]:flex-1 max-[680px]:text-xs max-[680px]:text-ink-3',
      cell: (l) => <Summary items={taskChanges(l, nameOf).summary} render={render} /> },
    { key: 'chev', header: <span className="sr-only">{t('lg.row.open')}</span>, width: '16px', mobile: 'hide',
      cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  return (
    <div data-testid="lg-task">
      <FilterBar label={t('lg.f.label')}>
        <LogSearch value={filters.taskTitle ?? ''} onChange={onSearch} placeholder={t('lgx.f.qTask')} testId="lg-q" />
        <LogDates from={filters.dateFrom ?? ''} to={filters.dateTo ?? ''} fromLabel={t('lg.f.from')} toLabel={t('lg.f.to')} testId="lg-dates"
          onFrom={(v) => set({ dateFrom: v || undefined })} onTo={(v) => set({ dateTo: v || undefined })} />
        <LogSelect label={t('lg.f.who')} value={filters.userId ?? ''} onChange={(v) => set({ userId: v || undefined })} testId="lg-who">
          <option value="">{t('lg.f.whoAll')}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </LogSelect>
        <LogSelect label={t('lg.f.act')} value={filters.action ?? ''} onChange={(v) => set({ action: v || undefined })} testId="lg-act">
          <option value="">{t('lg.f.actAll')}</option>
          {groupActions(TASK_FILTER_ACTIONS, TASK_ACTION_GROUPS).map((g) => (
            <optgroup key={g.group} label={t(g.group === 'other' ? 'lgx.g.other' : `lg.g.${g.group}` as never)}>
              {g.actions.map((a) => <option key={a} value={a}>{t(`lg.a.${a}` as never)}</option>)}
            </optgroup>
          ))}
        </LogSelect>
        <ClearFilters show={filtered} onClear={() => setFilters(BASE)} />
      </FilterBar>

      <LogMeta>
        {total !== undefined && <span>{t('lg.count', { n: f.number(total) })}</span>}
        {(filters.dateFrom || filters.dateTo) && <><span aria-hidden>·</span><span className="font-mono">{filters.dateFrom ? f.date(filters.dateFrom) : '…'} – {filters.dateTo ? f.date(filters.dateTo) : '…'}</span></>}
      </LogMeta>

      <DataTable ariaLabel={t('lg.tab.task')} columns={columns} rows={rows} getRowId={(l) => l.id} data-testid="lg-table"
        className="v2-lg" loading={q.isLoading} error={q.isError ? t('lg.ne.d') : undefined} onRetry={() => void q.refetch()}
        empty={filtered ? { icon: Filter, title: t('lg.nm.t'), description: t('lg.nm.d') } : undefined}
        onRowClick={setOpen} selectedId={open?.id}
        groupHeader={(l, i) => (startsNewDay(rows, i) ? <DayHeading iso={l.createdAt} /> : null)} />

      {total !== undefined && total > LOG_PAGE_SIZE && (
        <Pagination page={filters.page ?? 1} pageSize={LOG_PAGE_SIZE} total={total} onPageChange={(p) => set({ page: p })} />
      )}

      <TaskEventDrawer log={open} nameOf={nameOf} onClose={() => setOpen(null)}
        onTaskLog={(title) => { setOpen(null); setFilters({ ...BASE, taskTitle: title }); }} />
    </div>
  );
}
