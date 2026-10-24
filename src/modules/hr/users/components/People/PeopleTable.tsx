'use client';

/**
 * Bảng người dùng V2 (preview people `.tbl`): [chọn] · Người dùng (ảnh, tên, tên đăng nhập · email) · Vai trò ·
 * Trạng thái · Ngày tạo · ⋯. ≤900 ẩn Ngày tạo; ≤680 mỗi dòng thành khối 2 tầng (DataTable).
 * Bấm dòng = mở ngăn chi tiết. Menu ⋯ chỉ có thao tác V1 cho phép (rowActionGroups).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, History, KeyRound, Mail, Pencil, Trash2, UserCheck, UserX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { QuickMenu } from '@/shared/ui/QuickMenu';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { useRoleLabel } from '../../../shared/HrPageHead';
import { rowActionGroups, type RowActionKey } from '../../view/people-logic';
import type { UserWithRoleAndTasks } from '../../types';
import type { PeoplePageState } from './usePeoplePage';
import type { PeopleActions } from './usePeopleActions';

type U = UserWithRoleAndTasks;
type Icon = React.ComponentType<{ className?: string }>;
export const ROW_ACTION: Record<RowActionKey, { label: string; icon: Icon; danger?: boolean }> = {
  history: { label: 'pp.m.hist', icon: History },
  edit: { label: 'pp.m.edit', icon: Pencil },
  password: { label: 'pp.m.pw', icon: KeyRound },
  resetLink: { label: 'ppx.m.link', icon: Mail },
  deactivate: { label: 'pp.m.lock', icon: UserX, danger: true },
  activate: { label: 'pp.m.unlock', icon: UserCheck },
  delete: { label: 'pp.m.del', icon: Trash2, danger: true },
};

/** Trạng thái = chấm + chữ (Hoạt động / Đã vô hiệu hoá) + biểu tượng chìa khoá nếu phải đổi mật khẩu */
export function UserStatus({ u }: { u: U }) {
  const t = useTranslations();
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap text-[13px] text-ink-2">
      <span aria-hidden className={cn('size-2 flex-none rounded-full', u.isActive ? 'bg-c-done' : 'bg-ink-3')} />
      <span>{t(u.isActive ? 'pp.st.active' : 'pp.st.locked')}</span>
      {u.isActive && u.mustChangePassword && (
        <span className="inline-flex items-center text-c-review" title={t('pp.mc')}>
          <KeyRound aria-hidden className="size-3.5" /><span className="sr-only">{t('pp.mc')}</span>
        </span>
      )}
    </span>
  );
}

export function useRowMenu(s: PeoplePageState, a: PeopleActions) {
  const t = useTranslations();
  return (u: U) => rowActionGroups({ id: u.id, isActive: u.isActive, email: u.email, hasTasks: u.hasTasks, roleName: u.role.name }, s.ctx)
    .map((g) => g.map((k) => ({ key: k, label: t(ROW_ACTION[k].label), icon: ROW_ACTION[k].icon, danger: ROW_ACTION[k].danger, onSelect: () => a.run(k, u) })));
}

export function PeopleTable({ s, a }: { s: PeoplePageState; a: PeopleActions }) {
  const t = useTranslations();
  const fmt = useFormat();
  const roleLabel = useRoleLabel();
  const menu = useRowMenu(s, a);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const box = 'size-4 cursor-pointer accent-[var(--primary)]';

  const cols: DataTableColumn<U>[] = [
    ...(s.privileged ? [{
      key: 'sel', width: '18px', mobile: 'end' as const, mobileOrder: 9, className: 'max-[680px]:absolute max-[680px]:left-4 max-[680px]:top-[18px]',
      header: (
        <input type="checkbox" className={box} aria-label={t('pp.pickAll')} checked={s.allOn} disabled={!s.selectable.length}
          ref={(el) => { if (el) el.indeterminate = s.someOn; }} onChange={s.toggleAll} />
      ),
      cell: (u: U) => (s.selectable.includes(u.id) ? (
        <label className="-m-2 grid size-8 cursor-pointer place-items-center" onClick={stop} onKeyDown={stop}>
          <input type="checkbox" className={box} aria-label={t('pp.pick', { n: u.displayName })} checked={s.selected.includes(u.id)} onChange={() => s.toggle(u.id)} />
        </label>
      ) : null),
    }] : []),
    {
      key: 'user', header: t('pp.col.user'), mobile: 'main',
      cell: (u) => (
        <span className={cn('flex min-w-0 items-center gap-3', !u.isActive && 'opacity-60')}>
          <UserAvatar displayName={u.displayName} avatarUrl={u.profile?.avatarUrl} avatarColor={u.profile?.avatarColor} size="md" />
          <span className="flex min-w-0 flex-col">
            <b className="truncate text-sm font-medium leading-5 text-ink">
              {u.displayName}{u.id === s.selfId && <span className="font-normal text-ink-3"> {t('pp.you')}</span>}
            </b>
            <small className="flex min-w-0 items-center gap-1 truncate text-xs leading-4 text-ink-3">
              <span className="font-mono">{u.username}</span>
              {u.email && <><span aria-hidden>·</span><span className="truncate">{u.email}</span></>}
              {u.email && u.emailVerifiedAt && (
                <span title={t('ppx.verified')} className="inline-flex flex-none text-c-done"><BadgeCheck aria-hidden className="size-3.5" /><span className="sr-only">{t('ppx.verified')}</span></span>
              )}
            </small>
          </span>
        </span>
      ),
    },
    { key: 'role', header: t('pp.col.role'), width: '130px', mobileOrder: 2, cell: (u) => <span className="truncate text-[13px] text-ink-2 max-[680px]:text-xs">{roleLabel(u.role.name)}</span> },
    { key: 'status', header: t('pp.col.status'), width: '150px', mobileOrder: 3, cell: (u) => <UserStatus u={u} /> },
    { key: 'created', header: t('pp.k.created'), width: '104px', hideBelow: 'md', mobile: 'hide', cell: (u) => <span className="font-mono text-xs text-ink-3">{fmt.date(u.createdAt)}</span> },
    {
      key: 'more', header: <span className="sr-only">{t('pp.col.act')}</span>, width: '32px', align: 'end', mobile: 'end', mobileOrder: 9,
      className: 'max-[680px]:absolute max-[680px]:right-2 max-[680px]:top-2.5',
      cell: (u) => <QuickMenu groups={menu(u)} label={t('pp.more', { n: u.displayName })} />,
    },
  ];

  return (
    <DataTable<U>
      ariaLabel={t('pp.title')}
      className={cn('v2-people', s.privileged ? 'is-sel-on' : '')}
      columns={cols}
      rows={s.rows}
      getRowId={(u) => u.id}
      loading={s.users.isLoading}
      skeletonRows={7}
      error={s.users.isError ? t('pp.err.d') : undefined}
      onRetry={() => s.users.refetch()}
      empty={{
        icon: Search,
        title: t('pp.nomatch.t'),
        description: t('pp.nomatch.d'),
        action: <Button type="button" variant="outline" size="md" onClick={s.clearAll}>{t('pp.f.clear')}</Button>,
      }}
      onRowClick={(u) => a.setDrawer({ id: u.id })}
      selectedId={a.drawer?.id}
    />
  );
}
