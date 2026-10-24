'use client';

/** Hộp Thêm / Sửa mẫu hoàn thành (preview `editTemplate`). Luật/body V1: `validateTemplate` / `templateBody`. */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, inputClass, textareaClass, controlClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useCreateReportTemplate, useUpdateReportTemplate, type ReportTemplate } from '../../hooks/useReportTemplates';
import { useTaskTypes } from '../../hooks/useTaskTypes';
import { templateBody, templateFormFrom, validateTemplate, type FormErrors, type TemplateField, type TemplateForm } from '../../lib/catalog-forms';

export function TemplateDialog({ open, editing, onClose }: { open: boolean; editing: ReportTemplate | null; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const create = useCreateReportTemplate();
  const update = useUpdateReportTemplate();
  const { data: types = [] } = useTaskTypes();
  const [f, setF] = React.useState<TemplateForm>(templateFormFrom());
  const [errs, setErrs] = React.useState<FormErrors<TemplateField>>({});
  const pending = create.isPending || update.isPending;

  React.useEffect(() => {
    if (open) { setF(templateFormFrom(editing ?? undefined)); setErrs({}); }
  }, [open, editing]);

  const set = <K extends keyof TemplateForm>(k: K, v: TemplateForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in errs) setErrs((e) => ({ ...e, [k]: undefined }));
  };
  const msg = (k: TemplateField) => (errs[k] ? t(errs[k]!.key, errs[k]!.values) : undefined);

  async function submit() {
    const e = validateTemplate(f);
    setErrs(e);
    const first = (['title', 'category', 'content'] as const).find((k) => e[k]);
    if (first) { document.getElementById(`tpl-${first}`)?.focus(); return; }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: templateBody(f, 'edit') });
      else await create.mutateAsync(templateBody(f, 'create') as Parameters<typeof create.mutateAsync>[0]);
      toast.success(t(editing ? 'set.updated' : 'set.added', { x: f.title.trim() }));
      onClose();
    } catch (err) {
      toast.error(errMsg(err, editing ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm'));
    }
  }

  // loại đã bị xoá / không còn trong danh sách vẫn hiện để không đổi ngầm
  const typeMissing = f.taskTypeId && !types.some((x) => x.id === f.taskTypeId);
  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? t('set.editX', { x: editing.title }) : t('set.tpl.addT')}
      okLabel={editing ? t('set.saveBtn') : t('set.tpl.add')}
      onOk={submit}
      pending={pending}
      data-testid="tpl-dialog"
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <Field id="tpl-title" label={t('set.col.title')} required error={msg('title')}>
          <input className={inputClass} value={f.title} maxLength={200} placeholder={t('set.tpl.titlePh')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-x-4 max-[680px]:grid-cols-1">
          <Field id="tpl-category" label={t('set.col.cat')} error={msg('category')}>
            <input className={inputClass} value={f.category} maxLength={100} placeholder={t('set.tpl.catPh')} onChange={(e) => set('category', e.target.value)} />
          </Field>
          <Field id="tpl-type" label={t('set.col.type')} optional={false} hint={t('set.tpl.typeH')}>
            <select className={cn(controlClass, 'h-[38px] max-[680px]:h-11')} value={f.taskTypeId} onChange={(e) => set('taskTypeId', e.target.value)}>
              <option value="">{t('set.tpl.allTypes')}</option>
              {typeMissing && <option value={f.taskTypeId}>{f.taskTypeId}</option>}
              {types.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
        </div>
        <Field
          id="tpl-content"
          label={t('set.tpl.content')}
          required
          error={msg('content')}
          hint={<span className="flex justify-between gap-3"><span>{t('set.tpl.contentH')}</span><span className="whitespace-nowrap font-mono">{f.content.length}/5000</span></span>}
        >
          <textarea className={cn(textareaClass, 'min-h-[150px] font-mono text-[13px]')} rows={7} value={f.content} maxLength={5000} placeholder={t('set.tpl.contentPh')} onChange={(e) => set('content', e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" className="size-4 accent-primary" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          <span>{t('set.tpl.activeL')}</span>
        </label>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ActionDialog>
  );
}
