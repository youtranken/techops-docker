'use client';

/**
 * Mục "Loại công việc" (preview `pTypes`). API V1: GET/POST /api/settings/task-types, PATCH/DELETE /[id].
 * Thứ tự theo tên như server V1. Xoá: đang dùng → báo chưa xoá được (server V1 trả 409); chưa dùng → hỏi rồi DELETE.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useTaskTypes, useDeleteTaskType, type TaskType } from '../../hooks/useTaskTypes';
import { PanelHead } from '../shell/parts';
import { InUseDialog } from './PrioritiesPage';
import { RowActions } from './RowActions';
import { TaskTypeDialog } from './TaskTypeDialog';
import { TaskTypeGlyph } from './task-type-icons';

export function TaskTypesPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const confirm = useConfirm();
  const { data = [], isLoading, isError, refetch } = useTaskTypes();
  const remove = useDeleteTaskType();
  const [dlg, setDlg] = React.useState<{ editing: TaskType | null } | null>(null);
  const [inUse, setInUse] = React.useState<TaskType | null>(null);

  async function del(x: TaskType) {
    if ((x._count?.tasks ?? 0) > 0) { setInUse(x); return; }
    const ok = await confirm({ title: t('set.delQ', { x: x.name }), description: t('set.delD._'), confirmText: t('set.del'), danger: true });
    if (!ok) return;
    try {
      await remove.mutateAsync(x.id);
      toast.success(t('set.deleted', { x: x.name }));
    } catch (err) {
      toast.error(errMsg(err, 'Không thể xóa — đang được sử dụng'));
    }
  }

  const columns: DataTableColumn<TaskType>[] = [
    {
      key: 'name', header: t('set.col.name'), mobile: 'main',
      cell: (x) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-[30px] flex-none place-items-center rounded-ctl bg-surface-2 text-ink-2"><TaskTypeGlyph name={x.icon} /></span>
          <b className="truncate font-medium text-ink">{x.name}</b>
        </span>
      ),
    },
    { key: 'desc', header: t('set.col.desc'), width: 'minmax(0,1.5fr)', mobileOrder: 2, className: 'max-[680px]:basis-full', cell: (x) => (x.description ? <span className="block truncate text-[13px] text-ink-2">{x.description}</span> : <span aria-hidden className="text-ink-3 max-[680px]:hidden">—</span>) },
    { key: 'used', header: t('set.col.used'), width: '96px', cell: (x) => <span className="text-[13px] text-ink-2">{t('set.nTasks', { n: x._count?.tasks ?? 0 })}</span> },
    {
      key: 'act', header: <span className="sr-only">{t('set.col.act')}</span>, width: '76px', align: 'end', mobile: 'end',
      cell: (x) => (
        <RowActions>
          <Button type="button" variant="subtle" size="icon-sm" aria-label={t('set.editX', { x: x.name })} title={t('set.edit')} onClick={() => setDlg({ editing: x })}><Pencil aria-hidden /></Button>
          <Button type="button" variant="subtle" size="icon-sm" aria-label={t('set.delX', { x: x.name })} title={t('set.del')} onClick={() => del(x)}><Trash2 aria-hidden /></Button>
        </RowActions>
      ),
    },
  ];

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead
        title={t('set.s.types')}
        description={t('set.d.types')}
        actions={<Button type="button" size="md" onClick={() => setDlg({ editing: null })} disabled={isError} data-testid="tt-add"><Plus aria-hidden />{t('set.typ.add')}</Button>}
      />
      <DataTable
        ariaLabel={t('set.s.types')}
        columns={columns}
        rows={data}
        getRowId={(x) => x.id}
        loading={isLoading}
        skeletonRows={5}
        error={isError ? t('set.err.listT') : undefined}
        onRetry={() => refetch()}
        empty={{ title: t('ui.noData') }}
        data-testid="tt-table"
      />
      <TaskTypeDialog open={!!dlg} editing={dlg?.editing ?? null} all={data} onClose={() => setDlg(null)} />
      <InUseDialog item={inUse} href={inUse ? `/tasks?typeId=${inUse.id}` : ''} onClose={() => setInUse(null)} />
    </section>
  );
}
