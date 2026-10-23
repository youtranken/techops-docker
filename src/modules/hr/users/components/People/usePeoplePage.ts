'use client';

/** Trạng thái trang Nhân sự V2: người đang đăng nhập + quyền V1, bộ lọc, dữ liệu, chọn hàng loạt. */
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useMyPermissions } from '@/shared/hooks/useMyPermissions';
import { useUsers } from '../../hooks/useUsers';
import { useRoles } from '../../hooks/useRoles';
import {
  actorHrFeatures, isPrivilegedRole, selectableIds, toUsersQuery, withFilter, EMPTY_FILTERS, type PeopleFilters, type RowCtx,
} from '../../view/people-logic';

export function usePeoplePage() {
  const { data: session } = useSession();
  const role = session?.user?.role?.name ?? '';
  const selfId = session?.user?.id;
  const isAdmin = role === 'ADMIN';
  const privileged = isPrivilegedRole(role);
  const { hasFeature } = useMyPermissions();
  const hrFeatures = actorHrFeatures(role, hasFeature);
  const ctx: RowCtx = { selfId, actorPrivileged: privileged, hrFeatures };

  const [filters, setFilters] = React.useState<PeopleFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = React.useState<string[]>([]);
  const { data: roles = [] } = useRoles();
  const users = useUsers(toUsersQuery(filters));
  const rows = users.data?.data ?? [];
  const pagination = users.data?.pagination;

  const setFilter = React.useCallback(<K extends Exclude<keyof PeopleFilters, 'page'>>(k: K, v: PeopleFilters[K]) => {
    setFilters((f) => withFilter(f, k, v));
    setSelected([]);
  }, []);
  const clearFilters = React.useCallback(() => { setFilters((f) => ({ ...EMPTY_FILTERS, search: f.search })); setSelected([]); }, []);
  const clearAll = React.useCallback(() => { setFilters(EMPTY_FILTERS); setSelected([]); }, []);
  const setPage = React.useCallback((page: number) => { setFilters((f) => ({ ...f, page })); setSelected([]); }, []);

  const selectable = selectableIds(rows, selfId, privileged);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOn = selectable.length > 0 && selectable.every((id) => selected.includes(id));
  const someOn = !allOn && selectable.some((id) => selected.includes(id));
  const toggleAll = () => setSelected(allOn ? [] : selectable);

  return {
    role, selfId, isAdmin, privileged, ctx, roles,
    filters, setFilter, clearFilters, clearAll, setPage,
    users, rows, pagination,
    selected, setSelected, selectable, toggle, toggleAll, allOn, someOn,
  };
}
export type PeoplePageState = ReturnType<typeof usePeoplePage>;
