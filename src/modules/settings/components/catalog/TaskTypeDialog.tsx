'use client';

/** Hộp Thêm / Sửa loại công việc (preview `editType`): tên, lưới 24 biểu tượng (radio), mô tả. Body V1: `taskTypeBody`. */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useCreateTaskType, useUpdateTaskType, type TaskType } from '../../hooks/useTaskTypes';
import { taskTypeBody, taskTypeFormFrom, validateTaskType, type FormErrors, type TaskTypeField, type TaskTypeForm } from '../../lib/catalog-forms';
import { TASK_TYPE_ICONS, TASK_TYPE_ICON_NAMES } from './task-type-icons';

export function TaskTypeDialog({ open, editing, all, onClose }: { open: boolean; editing: TaskType | null; all: TaskType[]; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const create = useCreateTaskType();
  const update = useUpdateTaskType();
  const [f, setF] = React.useState<TaskTypeForm>(taskTypeFormFrom());
  const [errs, setErrs] = React.useState<FormErrors<TaskTypeField>>({});
  const pending = create.isPending || update.isPending;

  React.useEffect(() => {
    if (open) { setF(taskTypeFormFrom(editing ?? undefined)); setErrs({}); }
  }, [open, editing]);

  const set = <K extends keyof TaskTypeForm>(k: K, v: TaskTypeForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in errs) setErrs((e) => ({ ...e, [k]: undefined }));
  };
  const msg = (k: TaskTypeField) => (errs[k] ? t(errs[k]!.key, errs[k]!.values) : undefined);

  async function submit() {
    const e = validateTaskType(f, all, editing?.id);
    setErrs(e);
    const first = (['name', 'description'] as const).find((k) => e[k]);
    if (first) { document.getElementById(`tt-${first}`)?.focus(); return; }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: taskTypeBody(f, 'edit') });
      else await create.mutateAsync(taskTypeBody(f, 'create'));
      toast.success(t(editing ? 'set.updated' : 'set.added', { x: f.name }));
      onClose();
    } catch (err) {
      toast.error(errMsg(err, editing ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm'));
    }
  }

  // tên icon lạ đang lưu (dữ liệu cũ) vẫn giữ nếu không chọn lại
  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={editing ? t('set.editX', { x: editing.name }) : t('set.typ.addT')}
      okLabel={editing ? t('set.saveBtn') : t('set.typ.add')}
      onOk={submit}
      pending={pending}
      data-testid="tt-dialog"
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <Field id="tt-name" label={t('set.col.name')} required error={msg('name')}>
          <input className={inputClass} value={f.name} maxLength={50} placeholder={t('set.typ.namePh')} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field id="tt-icon" label={t('set.typ.icon')} asGroup optional={false}>
          <div role="radiogroup" aria-labelledby="tt-icon-lbl" className="grid grid-cols-8 gap-1.5 max-[680px]:grid-cols-6">
            {TASK_TYPE_ICON_NAMES.map((n) => {
              const Icon = TASK_TYPE_ICONS[n];
              const on = f.icon === n;
              return (
                <label key={n} title={t(`set.ic.${n}`)} className={cn(
                  'relative grid h-[38px] cursor-pointer place-items-center rounded-ctl border bg-surface text-ink-2',
                  'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                  on ? 'border-primary bg-primary-soft text-primary-text' : 'border-line hover:border-line-2 hover:bg-surface-2 hover:text-ink',
                )}>
                  <input type="radio" name="tt-icon" value={n} checked={on} onChange={() => set('icon', n)} aria-label={t(`set.ic.${n}`)} className="absolute size-px opacity-0" />
                  <Icon aria-hidden className="size-4" />
                </label>
              );
            })}
          </div>
        </Field>
        <Field id="tt-description" label={t('set.col.desc')} error={msg('description')}>
          <input className={inputClass} value={f.description} maxLength={255} placeholder={t('set.typ.descPh')} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ActionDialog>
  );
}
