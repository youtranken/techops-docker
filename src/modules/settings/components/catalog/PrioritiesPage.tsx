'use client';

/**
 * Mục "Mức ưu tiên" (preview `pPriorities`). API V1: GET/POST /api/settings/priorities, PATCH/DELETE /[id].
 * Bảng sắp mức cao → thấp như server V1. Xoá: đang dùng → báo chưa xoá được (server V1 cũng từ chối 409);
 * chưa dùng → hỏi xác nhận rồi DELETE.
 */
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { usePriorities, useDeletePriority, type Priority } from '../../hooks/usePriorities';
import { Dot, PanelHead } from '../shell/parts';
import { PriorityDialog } from './PriorityDialog';
import { RowActions } from './RowActions';

export function PrioritiesPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const confirm = useConfirm();
  const { data = [], isLoading, isError, refetch } = usePriorities();
  const remove = useDeletePriority();
  const [dlg, setDlg] = React.useState<{ editing: Priority | null } | null>(null);
  const [inUse, setInUse] = React.useState<Priority | null>(null);
  const rows = React.useMemo(() => [...data].sort((a, b) => b.level - a.level), [data]);

  async function del(p: Priority) {
    if ((p._count?.tasks ?? 0) > 0) { setInUse(p); return; }
    const ok = await confirm({ title: t('set.delQ', { x: p.name }), description: t('set.delD._'), confirmText: t('set.del'), danger: true });
    if (!ok) return;
    try {
      await remove.mutateAsync(p.id);
      toast.success(t('set.deleted', { x: p.name }));
    } catch (err) {
      toast.error(errMsg(err, 'Không thể xóa — đang được sử dụng'));
    }
  }

  const columns: DataTableColumn<Priority>[] = [
    {
      key: 'name', header: t('set.col.name'), mobile: 'main',
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="size-3 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(15,23,41,.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]" style={{ background: p.color }} />
          <b className="truncate font-medium text-ink">{p.name}</b>
        </span>
      ),
    },
    { key: 'level', header: t('set.col.level'), width: '64px', cell: (p) => <span className="font-mono text-[13px]"><span className="hidden text-ink-3 max-[680px]:inline">{t('set.col.level')}&nbsp;</span>{p.level}</span> },
    { key: 'def', header: t('set.col.def'), width: '108px', cell: (p) => (p.isDefault ? <Dot tone="done">{t('set.pri.isDef')}</Dot> : <span aria-hidden className="text-ink-3 max-[680px]:hidden">—</span>) },
    { key: 'used', header: t('set.col.used'), width: '96px', cell: (p) => <span className="text-[13px] text-ink-2">{t('set.nTasks', { n: p._count?.tasks ?? 0 })}</span> },
    {
      key: 'act', header: <span className="sr-only">{t('set.col.act')}</span>, width: '76px', align: 'end', mobile: 'end',
      cell: (p) => (
        <RowActions>
          <Button type="button" variant="subtle" size="icon-sm" aria-label={t('set.editX', { x: p.name })} title={t('set.edit')} onClick={() => setDlg({ editing: p })}><Pencil aria-hidden /></Button>
          <Button type="button" variant="subtle" size="icon-sm" aria-label={t('set.delX', { x: p.name })} title={t('set.del')} onClick={() => del(p)}><Trash2 aria-hidden /></Button>
        </RowActions>
      ),
    },
  ];

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead
        title={t('set.s.priorities')}
        description={t('set.d.priorities')}
        actions={<Button type="button" size="md" onClick={() => setDlg({ editing: null })} disabled={isError} data-testid="pri-add"><Plus aria-hidden />{t('set.pri.add')}</Button>}
      />
      <DataTable
        ariaLabel={t('set.s.priorities')}
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        loading={isLoading}
        skeletonRows={4}
        error={isError ? t('set.err.listT') : undefined}
        onRetry={() => refetch()}
        empty={{ title: t('ui.noData') }}
        data-testid="pri-table"
      />
      {!isLoading && !isError && <p className="m-0 mx-0.5 mt-3 text-xs text-ink-3">{t('set.pri.note')}</p>}
      <PriorityDialog open={!!dlg} editing={dlg?.editing ?? null} all={data} onClose={() => setDlg(null)} />
      <InUseDialog item={inUse} href={inUse ? `/tasks?priorityId=${inUse.id}` : ''} onClose={() => setInUse(null)} />
    </section>
  );
}

/** "Chưa xoá được" — đang có công việc dùng mục này */
export function InUseDialog({ item, href, onClose }: { item: { name: string; _count?: { tasks: number } } | null; href: string; onClose: () => void }) {
  const t = useTranslations();
  const n = item?._count?.tasks ?? 0;
  return (
    <ActionDialog open={!!item} onClose={onClose} size="sm" title={item ? t('set.inUse.t', { x: item.name }) : ''} data-testid="set-inuse">
      <p>{t('set.inUse.d', { n: t('set.nTasks', { n }) })}</p>
      <p><Link href={href} className="font-medium text-primary-text hover:underline">{t('setx.inUse.see')}</Link></p>
    </ActionDialog>
  );
}
