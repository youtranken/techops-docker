'use client';

/**
 * Tab "Người dùng" (/logs/user-activity) — preview logs.html tab user. Nghiệp vụ giữ V1:
 * - Lọc: khoảng ngày, người dùng (+ "Tên đăng nhập không tồn tại" = `UNKNOWN`), hành động (đúng 11 giá trị V1), nguồn IP.
 *   20 dòng/trang; URL gửi API giống hệt V1 (`userLogUrl`). Nhân viên: API V1 chỉ trả log của chính mình.
 * - Phase B (không hiện): ô tìm IP/tên đăng nhập, nút "Chỉ cảnh báo", lọc theo IP trong ngăn chi tiết.
 * Nhà mạng / vị trí / thiết bị (cột riêng ở V1) chuyển vào ngăn chi tiết như preview.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Filter } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { Pagination } from '@/shared/ui/Pagination';
import { useFormat } from '@/i18n/useFormat';
import type { UserLogEntry, UserLogFilters } from '../../types';
import { useUserActivityLogs } from '../../hooks/useUserActivityLogs';
import { useLogUserList } from '../../hooks/useLogUserList';
import {
  LOG_PAGE_SIZE, USER_ACTION_GROUPS, USER_FILTER_ACTIONS, groupActions, startsNewDay, timeHM, userActionKey, userDetail, userGroup,
} from '../../view/log-logic';
import { ActionMark, ClearFilters, DayHeading, FilterBar, LogDates, LogMeta, LogSelect, Person, UnknownPerson, useMsg } from './LogParts';
import { IpKind, UserEventDrawer } from './LogDrawers';

const BASE: UserLogFilters = { page: 1, limit: LOG_PAGE_SIZE };

export function UserLogView() {
  const t = useTranslations();
  const f = useFormat();
  const render = useMsg();
  const [filters, setFilters] = React.useState<UserLogFilters>(BASE);
  const [open, setOpen] = React.useState<UserLogEntry | null>(null);
  const q = useUserActivityLogs(filters);
  const { data: users = [] } = useLogUserList();

  const rows = q.data?.data ?? [];
  const total = q.data?.pagination.total;
  const set = (patch: Partial<UserLogFilters>) => setFilters((p) => ({ ...p, ...patch, page: patch.page ?? 1 }));
  const filtered = !!(filters.userId || filters.action || filters.ipType || filters.dateFrom || filters.dateTo);

  const detailText = (l: UserLogEntry) => {
    const d = userDetail(l.metadata);
    if (d) return render(d);
    const dev = l.parsedDevice;
    return dev ? `${dev.browser} ${dev.browserVersion} · ${dev.os}` : '';
  };
  const who = (l: UserLogEntry) => l.user
    ? <Person name={l.user.displayName} size="xs" />
    : <UnknownPerson tried={typeof l.metadata?.attemptedUsername === 'string' ? l.metadata.attemptedUsername : undefined} />;

  const columns: DataTableColumn<UserLogEntry>[] = [
    { key: 'time', header: t('lg.col.time'), width: '52px', mobile: 'end', mobileOrder: 2,
      cell: (l) => <time dateTime={l.createdAt} className="font-mono text-[13px] text-ink-2">{timeHM(l.createdAt)}</time> },
    { key: 'who', header: t('lg.col.user'), width: '168px', mobileOrder: 3, className: 'max-[680px]:min-w-0 max-[680px]:grow max-[680px]:basis-[50%] max-[680px]:text-xs', cell: who },
    { key: 'act', header: t('lg.col.act'), width: '200px', mobileOrder: 1, className: 'max-[680px]:grow max-[680px]:basis-[60%]',
      cell: (l) => {
        const k = userActionKey(l.action);
        const det = detailText(l);
        return <ActionMark group={userGroup(l.action)} label={k ? t(k as never) : l.action}
          sub={det ? <span className="hidden truncate text-xs text-ink-3 max-[1100px]:block max-[680px]:hidden">{det}</span> : undefined} />;
      } },
    { key: 'det', header: t('lg.col.detail'), hideBelow: 'lg', mobileOrder: 5, className: 'text-sm text-ink-2 max-[680px]:basis-full max-[680px]:text-xs max-[680px]:text-ink-3',
      cell: (l) => { const d = detailText(l); return d ? <span className="truncate" title={d}>{d}</span> : <span className="text-ink-3">—</span>; } },
    { key: 'src', header: t('lg.col.src'), width: '172px', mobileOrder: 4, className: 'max-[680px]:ml-auto',
      cell: (l) => (
        <span className="flex min-w-0 flex-col leading-snug max-[680px]:items-end">
          <span className="truncate font-mono text-xs text-ink-2">{l.ipAddress ?? '—'}</span>
          <IpKind kind={l.ipType} />
        </span>
      ) },
    { key: 'chev', header: <span className="sr-only">{t('lg.row.open')}</span>, width: '16px', mobile: 'hide',
      cell: () => <ChevronRight aria-hidden className="size-4 text-ink-3" /> },
  ];

  return (
    <div data-testid="lg-user">
      <FilterBar label={t('lg.f.label')}>
        <LogDates from={filters.dateFrom ?? ''} to={filters.dateTo ?? ''} fromLabel={t('lg.f.from')} toLabel={t('lg.f.to')} testId="lg-dates"
          onFrom={(v) => set({ dateFrom: v || undefined })} onTo={(v) => set({ dateTo: v || undefined })} />
        <LogSelect label={t('lg.col.user')} value={filters.userId ?? ''} onChange={(v) => set({ userId: v || undefined })} testId="lg-who">
          <option value="">{t('lg.f.whoAll')}</option>
          <option value="UNKNOWN">{t('lg.f.unknown')}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </LogSelect>
        <LogSelect label={t('lg.f.act')} value={filters.action ?? ''} onChange={(v) => set({ action: v || undefined })} testId="lg-act">
          <option value="">{t('lg.f.actAll')}</option>
          {groupActions(USER_FILTER_ACTIONS, USER_ACTION_GROUPS).map((g) => (
            <optgroup key={g.group} label={t(g.group === 'other' ? 'lgx.g.other' : `lg.g.${g.group}` as never)}>
              {g.actions.map((a) => <option key={a} value={a}>{t(`lg.u.${a}` as never)}</option>)}
            </optgroup>
          ))}
        </LogSelect>
        <LogSelect label={t('lg.f.ip')} value={filters.ipType ?? ''} onChange={(v) => set({ ipType: v || undefined })} testId="lg-ip">
          <option value="">{t('lg.f.ipAll')}</option>
          <option value="internal">{t('lg.ip.internal')}</option>
          <option value="external">{t('lg.ip.external')}</option>
        </LogSelect>
        <ClearFilters show={filtered} onClear={() => setFilters(BASE)} />
      </FilterBar>

      <LogMeta>
        {total !== undefined && <span>{t('lg.count', { n: f.number(total) })}</span>}
        {(filters.dateFrom || filters.dateTo) && <><span aria-hidden>·</span><span className="font-mono">{filters.dateFrom ? f.date(filters.dateFrom) : '…'} – {filters.dateTo ? f.date(filters.dateTo) : '…'}</span></>}
      </LogMeta>

      <DataTable ariaLabel={t('lg.tab.user')} columns={columns} rows={rows} getRowId={(l) => l.id} data-testid="lg-table"
        className="v2-lg" loading={q.isLoading} error={q.isError ? t('lg.ne.d') : undefined} onRetry={() => void q.refetch()}
        empty={filtered ? { icon: Filter, title: t('lg.nm.t'), description: t('lg.nm.d') } : undefined}
        onRowClick={setOpen} selectedId={open?.id}
        groupHeader={(l, i) => (startsNewDay(rows, i) ? <DayHeading iso={l.createdAt} /> : null)} />

      {total !== undefined && total > LOG_PAGE_SIZE && (
        <Pagination page={filters.page ?? 1} pageSize={LOG_PAGE_SIZE} total={total} onPageChange={(p) => set({ page: p })} />
      )}

      <UserEventDrawer log={open} onClose={() => setOpen(null)} />
    </div>
  );
}
