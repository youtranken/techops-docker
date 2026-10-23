'use client';

/**
 * Xin gia hạn (V2). V1: ngày mới ≥ hạn + 1 ngày (ô ngày `min`), lý do không rỗng;
 * gửi `onConfirm(reason.trim(), new Date(ngày).toISOString())`. Các luật còn lại do extension.service kiểm.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass, textareaClass } from '@/shared/ui/Field';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { extensionDateError, extensionMinDate, reasonError } from './action-dialog-rules';

interface RequestExtensionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, requestedDate: string) => void;
  currentDeadline: Date | string;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
}

export function RequestExtensionModal({
  open, onClose, onConfirm, currentDeadline, isLoading = false, task,
}: RequestExtensionModalProps) {
  const t = useTranslations();
  const f = useFormat();
  const [reason, setReason] = React.useState('');
  const [date, setDate] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const min = extensionMinDate(currentDeadline);

  React.useEffect(() => { if (open) { setReason(''); setDate(''); setTried(false); } }, [open]);

  const dErr = tried ? extensionDateError(date, currentDeadline) : null;
  const rErr = tried ? reasonError(reason, true) : null;

  function submit() {
    setTried(true);
    if (extensionDateError(date, currentDeadline)) { document.getElementById('dlg-ext-date')?.focus(); return; }
    if (reasonError(reason, true)) { document.getElementById('dlg-ext-reason')?.focus(); return; }
    onConfirm(reason.trim(), new Date(date).toISOString());
  }

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t('app.dlg.ext.t')}
      task={task}
      okLabel={t('app.dlg.ext.send')}
      onOk={submit}
      pending={isLoading}
    >
      <div className="mb-4 grid grid-cols-2 gap-3 max-[680px]:grid-cols-1">
        <div>
          <div className="mb-1.5 text-[13px] font-medium text-ink">{t('app.dlg.ext.cur')}</div>
          <div className={cn(inputClass, 'flex items-center bg-surface-2 font-mono text-ink-2')} data-testid="ext-cur">{f.date(currentDeadline)}</div>
        </div>
        <Field
          id="dlg-ext-date"
          className="mb-0"
          label={t('app.dlg.ext.new')}
          required
          error={dErr ? t(dErr.key, dErr.key === 'tdx.dlg.ext.dateErr' ? { d: f.date(min) } : dErr.values) : undefined}
        >
          <input type="date" min={min} className={cn(inputClass, 'font-mono')} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field id="dlg-ext-reason" label={t('app.dlg.reason')} required error={rErr ? t(rErr.key) : undefined}>
        <textarea rows={3} className={textareaClass} placeholder={t('app.dlg.ext.ph')} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <DialogNote>{t('tdx.dlg.ext.rules')}</DialogNote>
    </ActionDialog>
  );
}
