'use client';

/**
 * Gán người xử lý cho 1 ticket ("Tạo công việc") hoặc nhiều ticket (thanh hàng loạt) — V1 AssignHelpdeskModal / BulkAssignModal.
 * Gọi đúng API V1: POST /unassigned/{id} { assigneeId } (mỗi ticket 1 lần) → server tạo việc Đã xong và đánh dấu PUSHED.
 * Danh sách người = /api/tasks/assignable-users (V1). V1 không chọn sẵn theo IT Support → V2 cũng không.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import type { HelpdeskPendingItem } from '../../types';
import { useHdAssignableUsers } from '../../hooks/useAssignableUsers';

export interface HdAssignDialogProps {
  open: boolean;
  /** 1 ticket (ngăn chi tiết) — null khi gán hàng loạt */
  item: HelpdeskPendingItem | null;
  count: number;
  pending: boolean;
  onConfirm: (assigneeId: string) => void;
  onClose: () => void;
}

export function HdAssignDialog({ open, item, count, pending, onConfirm, onClose }: HdAssignDialogProps) {
  const t = useTranslations();
  const users = useHdAssignableUsers(open);
  const [value, setValue] = React.useState('');
  const [err, setErr] = React.useState(false);
  React.useEffect(() => { if (open) { setValue(''); setErr(false); } }, [open]);

  const bulk = !item;
  const submit = () => { if (!value) { setErr(true); document.getElementById('hd-as-sel')?.focus(); return; } onConfirm(value); };
  const hint = item ? (item.itSupport ? t('hd.kv.itHd', { n: item.itSupport }) : t('hd.as.hintNone')) : undefined;

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      size="sm"
      data-testid="hd-assign-dlg"
      title={bulk ? t('hd.dlg.bAssign.t', { n: count }) : t('hd.dlg.create.t')}
      task={item ? { code: item.hdId, title: item.tieuDe } : null}
      okLabel={bulk ? t('hd.dlg.bAssign.ok', { n: count }) : t('hd.act.create')}
      onOk={submit}
      pending={pending}
    >
      {bulk && <p>{t('hd.dlg.bAssign.d')}</p>}
      <Field id="hd-as-sel" label={t('hd.as.label')} required hint={hint} error={err ? t('hd.as.err') : undefined}>
        <select className={inputClass} value={value} disabled={users.isLoading} onChange={(e) => { setValue(e.target.value); setErr(false); }}>
          <option value="">{users.isLoading ? t('hdx.as.loading') : t('hd.as.pick')}</option>
          {(users.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
        </select>
      </Field>
      {!bulk && <DialogNote>{t('hd.dlg.create.d')}</DialogNote>}
    </ActionDialog>
  );
}
