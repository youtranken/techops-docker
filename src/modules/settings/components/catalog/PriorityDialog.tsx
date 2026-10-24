'use client';

/** Hộp Thêm / Sửa mức ưu tiên (preview `editPriority`). Luật + body V1: `lib/catalog-forms.ts`. */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useCreatePriority, useUpdatePriority, type Priority } from '../../hooks/usePriorities';
import { priorityBody, priorityFormFrom, validatePriority, type FormErrors, type PriorityField, type PriorityForm } from '../../lib/catalog-forms';

export function PriorityDialog({ open, editing, all, onClose }: { open: boolean; editing: Priority | null; all: Priority[]; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const create = useCreatePriority();
  const update = useUpdatePriority();
  const [f, setF] = React.useState<PriorityForm>(priorityFormFrom());
  const [errs, setErrs] = React.useState<FormErrors<PriorityField>>({});
  const pending = create.isPending || update.isPending;

  React.useEffect(() => {
    if (open) { setF(priorityFormFrom(editing ?? undefined)); setErrs({}); }
  }, [open, editing]);

  const set = <K extends keyof PriorityForm>(k: K, v: PriorityForm[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k in errs) setErrs((e) => ({ ...e, [k]: undefined }));
  };
  const msg = (k: PriorityField) => (errs[k] ? t(errs[k]!.key, errs[k]!.values) : undefined);

  async function submit() {
    const e = validatePriority(f, all, editing?.id);
    setErrs(e);
    const first = (['name', 'color', 'level'] as const).find((k) => e[k]);
    if (first) { document.getElementById(`pri-${first}`)?.focus(); return; }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data: priorityBody(f) });
      else await create.mutateAsync(priorityBody(f));
      toast.success(t(editing ? 'set.updated' : 'set.added', { x: f.name }));
      onClose();
    } catch (err) {
      toast.error(errMsg(err, editing ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm'));
    }
  }

  const validHex = /^#[0-9A-Fa-f]{6}$/.test(f.color);
  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      size="sm"
      title={editing ? t('set.editX', { x: editing.name }) : t('set.pri.addT')}
      okLabel={editing ? t('set.saveBtn') : t('set.pri.add')}
      onOk={submit}
      pending={pending}
      data-testid="pri-dialog"
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <Field id="pri-name" label={t('set.col.name')} required error={msg('name')}>
          <input className={inputClass} value={f.name} maxLength={50} placeholder={t('set.pri.namePh')} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-x-4 max-[680px]:grid-cols-1">
          <Field id="pri-color" label={t('set.pri.color')} required error={msg('color')}>
            <ColorInput value={f.color} validHex={validHex} onChange={(v) => set('color', v)} pickLabel={t('set.pri.pick')} />
          </Field>
          <Field id="pri-level" label={t('set.col.level')} required error={msg('level')}>
            <input className={cn(inputClass, 'font-mono')} type="number" inputMode="numeric" min={1} max={10} value={f.level} onChange={(e) => set('level', e.target.value)} />
          </Field>
        </div>
        <p className="-mt-2 mb-3.5 text-xs text-ink-3">{t('set.pri.levelH')}</p>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" className="size-4 accent-primary" checked={f.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
          <span>{t('set.pri.def')}</span>
        </label>
        <p className="m-0 ml-[26px] mt-0.5 text-xs text-ink-3">{t('set.pri.defH')}</p>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ActionDialog>
  );
}

/** Ô màu: bảng chọn + mã hex (Field gắn id/aria vào ô chữ) */
function ColorInput({ value, validHex, onChange, pickLabel, ...aria }: { value: string; validHex: boolean; onChange: (v: string) => void; pickLabel: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        aria-label={pickLabel}
        value={validHex ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-[42px] flex-none cursor-pointer rounded-ctl border border-line-2 bg-surface p-[3px] max-[680px]:h-11"
      />
      <input {...aria} className={cn(inputClass, 'font-mono')} value={value} maxLength={7} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
