'use client';

/**
 * Sửa thông tin (preview people `editDlg`) — giữ V1 EditUserModal: tên, email, vai trò (chỉ ADMIN/BOSS thấy),
 * mật khẩu mới tuỳ chọn (≥6 ở máy khách, máy chủ kiểm chính sách). Body PATCH giữ V1 (luôn gửi roleId).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useUpdateUser } from '../../hooks/useUpdateUser';
import { useRoles } from '../../hooks/useRoles';
import { useRoleLabel } from '../../../shared/HrPageHead';
import { editPayload, validateEdit, type EditField, type EditValues } from '../../view/people-forms';
import type { UserWithRole } from '../../types';

export function EditUserDialog({ user, onClose, canChangeRole, isSelf }: {
  user: UserWithRole | null; onClose: () => void; canChangeRole: boolean; isSelf: boolean;
}) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const roleLabel = useRoleLabel();
  const { data: roles = [] } = useRoles();
  const update = useUpdateUser();
  const [v, setV] = React.useState<EditValues>({ displayName: '', email: '', roleId: '', password: '', confirmPassword: '' });
  const [tried, setTried] = React.useState(false);
  const [srv, setSrv] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setV({ displayName: user.displayName, email: user.email ?? '', roleId: user.roleId, password: '', confirmPassword: '' });
      setTried(false);
      setSrv(null);
    }
  }, [user]);
  const errs = tried ? validateEdit(v) : {};
  const err = (k: EditField) => (errs[k] ? t(errs[k]!) : undefined);
  const set = (k: EditField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function submit() {
    if (!user) return;
    setTried(true);
    setSrv(null);
    if (Object.keys(validateEdit(v)).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="pp-edit"] [aria-invalid="true"]')?.focus());
      return;
    }
    try {
      await update.mutateAsync({ id: user.id, data: editPayload(v) });
      toast.success(t('pp.t.saved', { n: v.displayName }));
      onClose();
    } catch (e) {
      setSrv(errMsg(e, 'Đã xảy ra lỗi'));
    }
  }

  return (
    <ActionDialog
      open={!!user}
      onClose={onClose}
      title={t(isSelf ? 'pp.e.titleMe' : 'pp.e.title')}
      sub={user ? <span className="font-mono">{user.username}</span> : undefined}
      okLabel={t('pp.e.ok')}
      onOk={submit}
      pending={update.isPending}
      data-testid="pp-edit"
    >
      <Field id="pp-e-name" label={t('pp.f.name')} required error={err('displayName')}>
        <input className={inputClass} value={v.displayName} onChange={set('displayName')} />
      </Field>
      <Field id="pp-e-email" label={t('pp.f.email')} error={err('email')} hint={user?.email ? t('ppx.e.emailKeep') : undefined}>
        <input type="email" className={inputClass} value={v.email} onChange={set('email')} autoComplete="off" />
      </Field>
      {canChangeRole && (
        <Field id="pp-e-role" label={t('pp.col.role')} required error={err('roleId')} hint={isSelf ? t('ppx.e.selfRoleW') : undefined}>
          <select className={inputClass} value={v.roleId} onChange={set('roleId')}>
            {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
          </select>
        </Field>
      )}
      <Field id="pp-e-pw" label={t('ppx.e.newPw')} error={err('password')} hint={t('ppx.e.newPwHint')}>
        <input type="password" className={inputClass} value={v.password} onChange={set('password')} autoComplete="new-password" />
      </Field>
      {v.password && (
        <Field id="pp-e-pw2" label={t('pp.f.pw2')} required error={err('confirmPassword')}>
          <input type="password" className={inputClass} value={v.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
        </Field>
      )}
      {srv && <div role="alert"><DialogNote tone="bad">{srv}</DialogNote></div>}
    </ActionDialog>
  );
}
