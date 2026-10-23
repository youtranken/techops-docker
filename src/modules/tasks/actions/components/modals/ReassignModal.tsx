'use client';

/**
 * Giao lại khi mọi người đã từ chối/chuyển đi (V2). V1: chọn NHIỀU người trong danh sách người dùng đang hoạt động
 * (`useUsers({isActive:true})`), gửi `onConfirm(ids)`; việc về Chờ nhận việc (assignment.service reassign).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Field } from '@/shared/ui/Field';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useUsers } from '@/modules/hr/hooks/useUsers';

interface ReassignModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newAssigneeIds: string[]) => void;
  isLoading?: boolean;
  task?: { code?: string | null; title: string } | null;
}

export function ReassignModal({ open, onClose, onConfirm, isLoading = false, task }: ReassignModalProps) {
  const t = useTranslations();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [tried, setTried] = React.useState(false);
  const { data } = useUsers({ isActive: true });
  const users = data?.data ?? [];

  React.useEffect(() => { if (open) { setSelected([]); setTried(false); } }, [open]);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const err = tried && selected.length === 0 ? t('app.dlg.ra.err') : undefined;

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t('app.dlg.ra.t')}
      task={task}
      okLabel={t('act.reassign')}
      onOk={() => {
        setTried(true);
        if (!selected.length) { document.querySelector<HTMLInputElement>('input[name="dlg-ra"]')?.focus(); return; }
        onConfirm(selected);
      }}
      pending={isLoading}
    >
      <p>{t('app.dlg.ra.d')}</p>
      <Field
        id="dlg-ra"
        asGroup
        label={t('app.dlg.ra.pick')}
        required
        hint={selected.length ? t('app.dlg.ra.n', { n: selected.length }) : undefined}
        error={err}
      >
        <div role="group" aria-labelledby="dlg-ra-lbl" className="max-h-60 overflow-y-auto rounded-ctl border border-line">
          {users.map((u) => (
            <label key={u.id} className="flex min-h-10 cursor-pointer items-center gap-2.5 border-b border-line px-3 py-1.5 text-sm text-ink last:border-b-0 hover:bg-surface-2 max-[680px]:min-h-11">
              <input
                type="checkbox"
                name="dlg-ra"
                checked={selected.includes(u.id)}
                onChange={() => toggle(u.id)}
                className="size-4 flex-none accent-[var(--primary)]"
                aria-label={u.displayName}
              />
              <UserAvatar displayName={u.displayName} size="xs" />
              <span className="min-w-0 flex-1 truncate" aria-hidden>{u.displayName}</span>
            </label>
          ))}
        </div>
      </Field>
    </ActionDialog>
  );
}
