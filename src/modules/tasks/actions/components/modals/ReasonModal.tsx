'use client';

/**
 * Hộp nhập lý do (Từ chối kế hoạch, Từ chối nhận việc, Hủy công việc). Luật V1: `required` → lý do không rỗng
 * (không có tối thiểu ký tự); gửi `reason.trim()`.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, textareaClass } from '@/shared/ui/Field';
import { reasonError } from './action-dialog-rules';

interface ReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: React.ReactNode;
  note?: React.ReactNode;
  label?: string;
  placeholder?: string;
  required?: boolean;
  confirmLabel: string;
  danger?: boolean;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
}

export function ReasonModal({
  open, onClose, onConfirm, title, description, note, label, placeholder,
  required = false, confirmLabel, danger = false, isLoading = false, task,
}: ReasonModalProps) {
  const t = useTranslations();
  const [reason, setReason] = React.useState('');
  const [tried, setTried] = React.useState(false);

  React.useEffect(() => { if (open) { setReason(''); setTried(false); } }, [open]);

  const err = tried ? reasonError(reason, required) : null;

  function submit() {
    setTried(true);
    if (reasonError(reason, required)) {
      document.getElementById('dlg-reason')?.focus();
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={title}
      task={task}
      okLabel={confirmLabel}
      onOk={submit}
      danger={danger}
      pending={isLoading}
    >
      {description && <p>{description}</p>}
      <Field id="dlg-reason" label={label ?? t('app.dlg.reason')} required={required} error={err ? t(err.key, err.values) : undefined}>
        <textarea
          rows={4}
          className={textareaClass}
          placeholder={placeholder ?? t('tdx.dlg.reason.ph')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      {note && <DialogNote>{note}</DialogNote>}
    </ActionDialog>
  );
}
