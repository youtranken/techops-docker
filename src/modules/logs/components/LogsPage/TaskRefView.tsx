'use client';

/**
 * Tab "Tra cứu mã" (/logs/task-reference) — preview logs.html tab ref. Nghiệp vụ giữ V1:
 * - API chỉ cho ADMIN/BOSS (V1). Lọc: mã CV hoặc tiêu đề (`search`, V1 không tìm theo ID), người tạo, lịch từ/đến ngày
 *   (`scheduleFrom`/`scheduleTo` — preview bỏ, V1 có → giữ). 20 dòng/trang; URL gửi API giống hệt V1 (`taskRefUrl`).
 * - Cột STT của V1 bỏ (chỉ là số thứ tự hiển thị); cột Lịch thực hiện giữ.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Filter } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { Pagination } from '@/shared/ui/Pagination';
import { StatusDot } from '@/shared/ui/StatusDot';
import { useFormat } from '@/i18n/useFormat';
import type { TaskRefEntry, TaskRefFilters } from '../../types';
import { useTaskReferenceLogs } from '../../hooks/useTaskReferenceLogs';
import { useLogUserList } from '../../hooks/useLogUserList';
import { LOG_PAGE_SIZE } from '../../view/log-logic';
import { ClearFilters, CopyBtn, FilterBar, LogDates, LogMeta, LogSearch, LogSelect, Person } from './LogParts';
import { TaskRefDrawer } from './LogDrawers';

const BASE: TaskRefFilters = { page: 1, limit: LOG_PAGE_SIZE };

export function TaskRefView() {
  const t = useTranslations();
  const f = useFormat();
  const router = useRouter();
  const [filters, setFilters] = React.useState<TaskRefFilters>(BASE);
  const [open, setOpen] = React.useState<TaskRefEntry | null>(null);
  const q = useTaskReferenceLogs(filters);
  const { data: users = [] } = useLogUserList();

  const rows = q.data?.data ?? [];
  const total = q.data?.pagination.total;
  const set = (patch: Partial<TaskRefFilters>) => setFilters((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  const onSearch = React.useCallback((v: string) => setFilters((p) => ({ ...p, search: v || undefined, page: 1 })), []);
  const filtered = !!(filters.search || filters.creatorId || filters.scheduleFrom || filters.scheduleTo);
  const needle = (filters.search ?? '').trim().toLowerCase();

  const columns: DataTableColumn<TaskRefEntry>[] = [
    { key: 'code', header: t('lg.col.code'), width: '112px', mobileOrder: 1,
      cell: (e) => e.taskCode
        ? <span className="flex items-center gap-0.5"><span className="font-mono text-[13px] font-medium text-ink">{e.taskCode}</span><CopyBtn value={e.taskCode} /></span>
        : <span className="text-ink-3">—</span> },
    { key: 'title', header: t('lg.col.title'), mobile: 'main', mobileOrder: 3,
      cell: (e) => (
        <span className="flex min-w-0 flex-col gap-0.5 py-1.5 max-[680px]:py-0">
          <span className="truncate text-[15px] text-ink" title={e.title}>{e.title}</span>
          <span className="flex items-center gap-1.5 text-xs">
            <StatusDot status={e.status} className="text-xs" />
            {needle && e.taskCode?.toLowerCase() === needle && <span className="font-medium text-primary-text">· {t('lg.ref.exact')}</span>}
          </span>
        </span>
      ) },
    { key: 'id', header: t('lg.col.id'), width: '214px', hideBelow: 'md', mobileOrder: 4, className: 'max-[680px]:basis-full',
      cell: (e) => <span className="flex min-w-0 items-center gap-0.5"><span className="truncate font-mono text-xs text-ink-3" title={e.id}>{e.id}</span><CopyBtn value={e.id} /></span> },
    { key: 'cr', header: t('lg.f.creator'), width: '150px', hideBelow: 'lg', mobile: 'hide',
      cell: (e) => <Person name={e.creator.displayName} size="xs" /> },
    { key: 'sched', header: t('lgx.col.sched'), width: '150px', hideBelow: 'lg', mobile: 'hide',
      cell: (e) => <span className="font-mono text-xs text-ink-2">{f.dayMonth(e.scheduleStart)} → {f.dayMonth(e.scheduleEnd)}</span> },
    { key: 'at', header: t('lg.col.created'), width: '92px', mobile: 'end', mobileOrder: 2,
      cell: (e) => <span className="font-mono text-xs text-ink-2">{f.date(e.createdAt)}</span> },
    { key: 'chev', header: <span className="sr-only">{t('lg.row.open')}</span>, width: '16px', mobile: 'hide',
      cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  return (
    <div data-testid="lg-ref">
      <FilterBar label={t('lg.f.label')}>
        <LogSearch value={filters.search ?? ''} onChange={onSearch} placeholder={t('lgx.f.qRef')} testId="lg-q" />
        <LogSelect label={t('lg.f.creator')} value={filters.creatorId ?? ''} onChange={(v) => set({ creatorId: v || undefined })} testId="lg-who">
          <option value="">{t('lg.f.creatorAll')}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </LogSelect>
        <LogDates from={filters.scheduleFrom ?? ''} to={filters.scheduleTo ?? ''} fromLabel={t('lgx.f.schedFrom')} toLabel={t('lgx.f.schedTo')} testId="lg-dates"
          onFrom={(v) => set({ scheduleFrom: v || undefined })} onTo={(v) => set({ scheduleTo: v || undefined })} />
        <ClearFilters show={filtered} onClear={() => setFilters(BASE)} />
      </FilterBar>
      <p className="m-0 mb-3 text-sm text-ink-3">{t('lgx.ref.hint')}</p>

      <LogMeta>{total !== undefined && <span>{t('lg.countRef', { n: f.number(total) })}</span>}</LogMeta>

      <DataTable ariaLabel={t('lg.tab.ref')} columns={columns} rows={rows} getRowId={(e) => e.id} data-testid="lg-table"
        className="v2-lg" loading={q.isLoading} error={q.isError ? t('lg.ne.d') : undefined} onRetry={() => void q.refetch()}
        empty={filtered ? { icon: Filter, title: t('lg.nm.tRef'), description: t('lg.nm.d') } : undefined}
        onRowClick={setOpen} selectedId={open?.id} />

      {total !== undefined && total > LOG_PAGE_SIZE && (
        <Pagination page={filters.page ?? 1} pageSize={LOG_PAGE_SIZE} total={total} onPageChange={(p) => set({ page: p })} />
      )}

      <TaskRefDrawer entry={open} onClose={() => setOpen(null)}
        onTaskLog={(title) => router.push(`/logs/task-activity?taskTitle=${encodeURIComponent(title)}`)} />
    </div>
  );
}
