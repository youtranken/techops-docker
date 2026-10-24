'use client';

/**
 * Mục "Mẫu hoàn thành" (preview `pTemplates`). API V1: GET/POST /api/settings/completion-templates, PUT/DELETE /[id].
 * Thao tác giữ V1: Sửa, bật/tắt dùng mẫu (PUT { isActive } — V1 là nút gạt trên dòng, V2 đưa vào menu ⋯), Xoá (hỏi trước).
 * Nhân viên được cấp quyền thấy đúng như V1 (API chỉ trả mẫu đang dùng).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, EyeOff, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { QuickMenu } from '@/shared/ui/QuickMenu';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useReportTemplates, useUpdateReportTemplate, useDeleteReportTemplate, type ReportTemplate } from '../../hooks/useReportTemplates';
import { useTaskTypes } from '../../hooks/useTaskTypes';
import { Dot, PanelHead } from '../shell/parts';
import { RowActions } from './RowActions';
import { TemplateDialog } from './TemplateDialog';

export function TemplatesPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const confirm = useConfirm();
  const { data = [], isLoading, isError, refetch } = useReportTemplates();
  const { data: types = [] } = useTaskTypes();
  const update = useUpdateReportTemplate();
  const remove = useDeleteReportTemplate();
  const [dlg, setDlg] = React.useState<{ editing: ReportTemplate | null } | null>(null);
  const typeName = React.useMemo(() => Object.fromEntries(types.map((x) => [x.id, x.name])), [types]);

  async function toggle(x: ReportTemplate) {
    try {
      await update.mutateAsync({ id: x.id, data: { isActive: !x.isActive } });
      toast.success(t(x.isActive ? 'set.tpl.hidden' : 'set.tpl.shown', { x: x.title }));
    } catch (err) {
      toast.error(errMsg(err, 'Không thể thay đổi trạng thái'));
    }
  }

  async function del(x: ReportTemplate) {
    const ok = await confirm({ title: t('set.delQ', { x: x.title }), description: t('set.delD.tpl'), confirmText: t('set.del'), danger: true });
    if (!ok) return;
    try {
      await remove.mutateAsync(x.id);
      toast.success(t('set.deleted', { x: x.title }));
    } catch (err) {
      toast.error(errMsg(err, 'Không thể xóa'));
    }
  }

  const columns: DataTableColumn<ReportTemplate>[] = [
    { key: 'title', header: t('set.col.title'), width: 'minmax(0,1.5fr)', mobile: 'main', cell: (x) => <b className="block truncate font-medium text-ink">{x.title}</b> },
    { key: 'cat', header: t('set.col.cat'), width: 'minmax(0,.8fr)', cell: (x) => <span className={x.category ? 'block truncate text-[13px] text-ink-2' : 'text-[13px] text-ink-3'}>{x.category ?? '—'}</span> },
    {
      key: 'type', header: t('set.col.type'), width: 'minmax(0,.9fr)',
      cell: (x) => <span className={x.taskTypeId ? 'block truncate text-[13px] text-ink-2' : 'text-[13px] text-ink-3'}>{x.taskTypeId ? (typeName[x.taskTypeId] ?? x.taskTypeId) : t('set.tpl.allTypes')}</span>,
    },
    { key: 'st', header: t('set.col.status'), width: '104px', cell: (x) => <Dot tone={x.isActive ? 'done' : 'off'}>{t(x.isActive ? 'set.tpl.on' : 'set.tpl.off')}</Dot> },
    {
      key: 'act', header: <span className="sr-only">{t('set.col.act')}</span>, width: '76px', align: 'end', mobile: 'end',
      cell: (x) => (
        <RowActions>
          <Button type="button" variant="subtle" size="icon-sm" aria-label={t('set.editX', { x: x.title })} title={t('set.edit')} onClick={() => setDlg({ editing: x })}><Pencil aria-hidden /></Button>
          <QuickMenu
            label={t('set.moreX', { x: x.title })}
            groups={[
              [{ key: 'toggle', label: t(x.isActive ? 'set.tpl.hide' : 'set.tpl.show'), icon: x.isActive ? EyeOff : Eye, onSelect: () => toggle(x) }],
              [{ key: 'del', label: t('set.del'), icon: Trash2, danger: true, onSelect: () => del(x) }],
            ]}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead
        title={t('set.s.templates')}
        description={t('set.d.templates')}
        actions={<Button type="button" size="md" onClick={() => setDlg({ editing: null })} disabled={isError} data-testid="tpl-add"><Plus aria-hidden />{t('set.tpl.add')}</Button>}
      />
      <DataTable
        ariaLabel={t('set.s.templates')}
        columns={columns}
        rows={data}
        getRowId={(x) => x.id}
        loading={isLoading}
        skeletonRows={4}
        error={isError ? t('set.err.listT') : undefined}
        onRetry={() => refetch()}
        empty={{ icon: FileText, title: t('set.tpl.emptyT'), description: t('set.tpl.emptyD') }}
        data-testid="tpl-table"
      />
      {!isLoading && !isError && data.length > 0 && <p className="m-0 mx-0.5 mt-3 text-xs text-ink-3">{t('set.tpl.note')}</p>}
      <TemplateDialog open={!!dlg} editing={dlg?.editing ?? null} onClose={() => setDlg(null)} />
    </section>
  );
}
