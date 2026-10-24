'use client';

/**
 * Thao tác trên người dùng (menu ⋯, ngăn chi tiết, thanh hàng loạt) — gọi đúng API/hook V1:
 *  Vô hiệu hoá / Kích hoạt: PATCH { isActive } · Xoá: DELETE · Gửi link: POST send-reset-link ·
 *  Hàng loạt: POST bulk-action { deactivate | activate | changeRole | forceChangePassword }.
 * Khác V1: Vô hiệu hoá / Kích hoạt (1 người và hàng loạt) nay hỏi xác nhận trước (V1 làm ngay).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';
import { useDeactivateUser } from '../../hooks/useDeactivateUser';
import { useActivateUser } from '../../hooks/useActivateUser';
import { useDeleteUser } from '../../hooks/useDeleteUser';
import { useBulkAction, type BulkActionType } from '../../hooks/useBulkAction';
import type { UserWithRoleAndTasks } from '../../types';
import type { RowActionKey } from '../../view/people-logic';

type U = UserWithRoleAndTasks;

export function usePeopleActions({ onCleared }: { onCleared: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const confirm = useConfirm();
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const del = useDeleteUser();
  const bulk = useBulkAction(onCleared);

  const [editing, setEditing] = React.useState<U | null>(null);
  const [pwTarget, setPwTarget] = React.useState<U | null>(null);
  const [drawer, setDrawer] = React.useState<{ id: string; history?: boolean } | null>(null);

  async function run(key: RowActionKey, u: U) {
    switch (key) {
      case 'history': setDrawer({ id: u.id, history: true }); return;
      case 'edit': setEditing(u); return;
      case 'password': setPwTarget(u); return;
      case 'resetLink': {
        if (!(await confirm({ title: t('ppx.d.link.t'), description: t('ppx.d.link.d', { e: u.email ?? '', n: u.displayName }), confirmText: t('pp.d.resend.ok') }))) return;
        try {
          const res = await fetch(`/api/hr/users/${u.id}/send-reset-link`, { method: 'POST' });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw toApiError(body, 'Không thể gửi email', res.status);
          toast.success(t('pp.t.sent', { e: u.email ?? '' }));
        } catch (e) { toast.error(errMsg(e, 'Gửi email thất bại')); }
        return;
      }
      case 'deactivate': {
        if (!(await confirm({ title: t('pp.d.lock1.t', { n: u.displayName }), description: t('ppx.d.deact1.d'), confirmText: t('pp.d.lock.ok'), danger: true }))) return;
        try { await deactivate.mutateAsync(u.id); toast.success(t('pp.t.lock1', { n: u.displayName })); }
        catch (e) { toast.error(errMsg(e, 'Không thể vô hiệu hóa người dùng')); }
        return;
      }
      case 'activate': {
        if (!(await confirm({ title: t('pp.d.unlock.t', { n: u.displayName }), description: t('ppx.d.unlock.d'), confirmText: t('pp.m.unlock') }))) return;
        try { await activate.mutateAsync(u.id); toast.success(t('pp.t.unlock', { n: u.displayName })); }
        catch (e) { toast.error(errMsg(e, 'Không thể kích hoạt người dùng')); }
        return;
      }
      case 'delete': {
        if (!(await confirm({ title: t('pp.d.del.t', { n: u.displayName }), description: t('pp.d.del.d', { u: u.username }), confirmText: t('pp.d.del.ok'), danger: true }))) return;
        try {
          await del.mutateAsync(u.id);
          toast.success(t('pp.t.del', { n: u.displayName }));
          setDrawer((d) => (d?.id === u.id ? null : d));
        } catch (e) { toast.error(errMsg(e, 'Xóa thất bại')); }
        return;
      }
    }
  }

  async function runBulk(action: BulkActionType, ids: string[], role?: { id: string; label: string }) {
    if (!ids.length) return;
    const n = ids.length;
    const ask = {
      deactivate: { title: t('pp.d.lock.t', { n }), description: t('ppx.d.deactN.d'), confirmText: t('pp.d.lock.ok'), danger: true },
      activate: { title: t('pp.d.unlockN.t', { n }), description: t('ppx.d.unlock.d'), confirmText: t('pp.bulk.unlock') },
      forceChangePassword: { title: t('pp.d.force.t', { n }), description: t('pp.d.force.d'), confirmText: t('pp.d.force.ok') },
      changeRole: { title: t('pp.d.role.t', { n }), description: t('ppx.d.role.d', { r: role?.label ?? '' }), confirmText: t('pp.d.role.ok') },
    }[action];
    if (!(await confirm(ask))) return;
    bulk.mutate({ action, userIds: ids, ...(action === 'changeRole' ? { roleId: role?.id } : {}) });
  }

  return {
    run, runBulk, bulkPending: bulk.isPending,
    editing, setEditing, pwTarget, setPwTarget, drawer, setDrawer,
  };
}
export type PeopleActions = ReturnType<typeof usePeopleActions>;
