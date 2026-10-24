'use client';

/**
 * Hành động của trang Helpdesk — đúng API V1, chỉ thêm hộp xác nhận / thông báo song ngữ:
 * lấy dữ liệu ngay (POST /sync), xuất Excel, gán/xoá 1 hoặc nhiều ticket. Đẩy tất cả sang công việc (push-to-tasks) để Phase B — V1 không gắn nút.
 */
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import type { HelpdeskPendingItem, PendingFilters } from '../../types';
import { useHelpdeskSync } from '../../hooks/useHelpdeskSync';
import { useAssignHelpdesk, useBulkAssignHelpdesk, useBulkDeleteHelpdesk, useDeleteHelpdesk, BulkError } from '../../hooks/useHelpdeskMutations';
import { exportUrl } from './hd-logic';
import { useCounts } from './HdSyncBar';

export function useHdActions() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const confirm = useConfirm();
  const counts = useCounts();
  const sync = useHelpdeskSync();
  const assign = useAssignHelpdesk();
  const del = useDeleteHelpdesk();
  const bulkAssign = useBulkAssignHelpdesk();
  const bulkDel = useBulkDeleteHelpdesk();

  const bulkErr = (e: unknown) => toast.error(e instanceof BulkError ? t('hdx.bulk.fail', { n: e.failed }) : errMsg(e));

  return {
    syncing: sync.isPending,
    syncError: sync.error ? errMsg(sync.error) : null,
    syncNow: () => sync.mutate(undefined, {
      onSuccess: (r) => toast.success(t('hd.toast.synced', { r: counts({ ...r, errors: r.errors.length }) })),
    }),

    /** V1: tải file .xlsx theo bộ lọc hiện tại */
    exportExcel: async (filters: PendingFilters) => {
      try {
        const res = await fetch(exportUrl(filters));
        if (!res.ok) throw new Error(t('hdx.export.err'));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `helpdesk-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click(); URL.revokeObjectURL(url);
      } catch { toast.error(t('hdx.export.err')); }
    },

    assignPending: assign.isPending || bulkAssign.isPending,
    assignOne: (it: HelpdeskPendingItem, assigneeId: string, done: () => void) => assign.mutate({ id: it.id, assigneeId }, {
      onSuccess: (task) => {
        const code = (task as { hdCode?: string | null }).hdCode;
        toast.success(t('hd.toast.created', { id: code ? `HD-${code}` : '', hd: it.hdId }));
        done();
      },
      onError: (e) => toast.error(errMsg(e)),
    }),
    assignMany: (ids: string[], assigneeId: string, name: string, done: () => void) => bulkAssign.mutate({ ids, assigneeId }, {
      onSuccess: () => { toast.success(t('hd.toast.bAssign', { n: ids.length, p: name })); done(); },
      onError: bulkErr,
    }),

    deleting: del.isPending || bulkDel.isPending,
    deleteOne: async (it: HelpdeskPendingItem, done: () => void) => {
      const ok = await confirm({ title: t('hd.dlg.del1.t', { id: it.hdId }), description: t('hd.dlg.del.d'), confirmText: t('hd.act.del'), danger: true });
      if (!ok) return;
      del.mutate(it.id, {
        onSuccess: () => { toast.success(t('hd.toast.del1', { id: it.hdId })); done(); },
        onError: (e) => toast.error(errMsg(e)),
      });
    },
    deleteMany: async (ids: string[], done: () => void) => {
      const ok = await confirm({ title: t('hd.dlg.delN.t', { n: ids.length }), description: t('hd.dlg.del.d'), confirmText: t('hd.dlg.delN.ok', { n: ids.length }), danger: true });
      if (!ok) return;
      bulkDel.mutate(ids, { onSuccess: () => { toast.success(t('hd.toast.delN', { n: ids.length })); done(); }, onError: bulkErr });
    },

  };
}
