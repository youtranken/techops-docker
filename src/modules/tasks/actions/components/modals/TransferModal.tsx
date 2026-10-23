'use client';

/**
 * Chuyển giao phần việc (V2). Danh sách người nhận = `assignable-users` V1 trừ mình và mọi người đã có trong việc;
 * ghi chú bắt buộc (luật UI V1). Gửi `onConfirm(newAssigneeId, notes.trim())` như V1.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field, textareaClass } from '@/shared/ui/Field';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useAssignableUsers } from '../../../hooks/useAssignableUsers';
import { transferErrors } from './action-dialog-rules';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newAssigneeId: string, notes: string) => void;
  currentUserId: string;
  currentAssigneeIds: string[];
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
}

export function TransferModal({
  open, onClose, onConfirm, currentUserId, currentAssigneeIds, isLoading = false, task,
}: TransferModalProps) {
  const t = useTranslations();
  const [to, setTo] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const { data } = useAssignableUsers();
  const users = (data?.data ?? []).filter((u) => u.id !== currentUserId && !currentAssigneeIds.includes(u.id));

  React.useEffect(() => { if (open) { setTo(''); setNotes(''); setTried(false); } }, [open]);

  const errs = tried ? transferErrors(to, notes) : { to: null, notes: null };

  function submit() {
    setTried(true);
    const e = transferErrors(to, notes);
    if (e.to) { document.querySelector<HTMLInputElement>('input[name="dlg-tr-to"]')?.focus(); return; }
    if (e.notes) { document.getElementById('dlg-tr-note')?.focus(); return; }
    onConfirm(to, notes.trim());
  }

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t('app.dlg.tr.t')}
      task={task}
      okLabel={t('app.dlg.tr.ok')}
      onOk={submit}
      pending={isLoading}
    >
      <p>{t('app.dlg.tr.d')}</p>
      <Field id="dlg-tr-to" asGroup label={t('app.dlg.tr.to')} required hint={t('app.dlg.tr.hint')} error={errs.to ? t(errs.to.key) : undefined}>
        <div role="radiogroup" aria-labelledby="dlg-tr-to-lbl" className="max-h-56 overflow-y-auto rounded-ctl border border-line">
          {users.length === 0 && <p className="m-0 px-3 py-2.5 text-[13px] text-ink-3">{t('tdx.dlg.tr.empty')}</p>}
          {users.map((u) => (
            <label key={u.id} className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-line px-3 py-1.5 text-sm text-ink last:border-b-0 hover:bg-surface-2 max-[680px]:min-h-11">
              <input
                type="radio"
                name="dlg-tr-to"
                value={u.id}
                checked={to === u.id}
                onChange={() => setTo(u.id)}
                className="size-4 flex-none accent-[var(--primary)]"
              />
              <UserAvatar displayName={u.displayName} size="xs" />
              <span className="min-w-0 flex-1 truncate">
                {u.displayName}
                {u.role?.name === 'BOSS' && <small className="text-xs text-ink-3"> · {t('role.boss')}</small>}
              </span>
            </label>
          ))}
        </div>
      </Field>
      <Field id="dlg-tr-note" label={t('app.dlg.tr.note')} required error={errs.notes ? t(errs.notes.key) : undefined}>
        <textarea rows={3} className={textareaClass} placeholder={t('app.dlg.tr.ph')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </ActionDialog>
  );
}
