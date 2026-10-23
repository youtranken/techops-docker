'use client';

/**
 * Đặt lại mật khẩu cho người khác (V1 ChangePasswordModal): PATCH { password }, phải đạt chính sách
 * (V1 báo lỗi bằng toast, V2 báo dưới ô). Gửi link đặt lại vẫn là mục riêng trong menu ⋯ như V1.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useResetPassword } from '../../hooks/useResetPassword';
import { validateResetPassword } from '../../view/people-forms';
import { PasswordChecklist, usePasswordPolicy } from './PasswordChecklist';

export function ResetPasswordDialog({ user, onClose }: { user: { id: string; displayName: string } | null; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const reset = useResetPassword();
  const policy = usePasswordPolicy(!!user);
  const [pw, setPw] = React.useState('');
  const [cf, setCf] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const [srv, setSrv] = React.useState<string | null>(null);
  React.useEffect(() => { if (user) { setPw(''); setCf(''); setTried(false); setSrv(null); } }, [user]);
  const errs = tried ? validateResetPassword(pw, cf, policy) : {};

  async function submit() {
    if (!user) return;
    setTried(true);
    setSrv(null);
    if (Object.keys(validateResetPassword(pw, cf, policy)).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="pp-pw"] [aria-invalid="true"]')?.focus());
      return;
    }
    try {
      await reset.mutateAsync({ userId: user.id, password: pw });
      toast.success(t('pp.t.pw', { n: user.displayName }));
      onClose();
    } catch (e) {
      setSrv(errMsg(e, 'Đổi mật khẩu thất bại'));
    }
  }

  return (
    <ActionDialog open={!!user} onClose={onClose} title={t('pp.p.title', { n: user?.displayName ?? '' })} okLabel={t('pp.p.okSet')} onOk={submit} pending={reset.isPending} size="sm" data-testid="pp-pw">
      <Field id="pp-p-pw" label={t('pp.f.pw')} required error={errs.password ? t(errs.password) : undefined} className="mb-0">
        <input type="password" className={inputClass} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </Field>
      <PasswordChecklist id="pp-p-pwc" policy={policy} value={pw} />
      <div className="h-4" />
      <Field id="pp-p-pw2" label={t('pp.f.pw2')} required error={errs.confirmPassword ? t(errs.confirmPassword) : undefined}>
        <input type="password" className={inputClass} value={cf} onChange={(e) => setCf(e.target.value)} autoComplete="new-password" />
      </Field>
      <p className="m-0 text-xs text-ink-3">{t('ppx.p.mcNote')}</p>
      {srv && <div role="alert"><DialogNote tone="bad">{srv}</DialogNote></div>}
    </ActionDialog>
  );
}
