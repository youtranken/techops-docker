'use client';

/**
 * Hộp Đổi mật khẩu (preview profile.html `openPw`). Luật V1:
 *  - chính sách từ GET /api/auth/password-policy (hiện danh sách yêu cầu, tick khi đạt);
 *  - POST /api/settings/profile/change-password { currentPassword, newPassword } — server vẫn kiểm lại (5 lần/giờ, sai mật khẩu hiện tại, trùng mật khẩu cũ);
 *  - xong: toast + router.refresh() như V1. Lỗi hiện dưới đúng ô (hoặc ghi chú đỏ đầu hộp khi không thuộc ô nào).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field } from '@/shared/ui/Field';
import { toApiError } from '@/lib/errors';
import { useErrorMessage } from '@/lib/useErrorMessage';
import type { PasswordPolicyConfig } from '../../types';
import {
  DEFAULT_POLICY, policyChecks, validatePasswordForm, changePasswordPayload, passwordServerError,
  type PasswordErrors, type PasswordForm,
} from '../../lib/password-rules';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { PasswordPolicyList } from '@/shared/ui/PasswordPolicyList';

const EMPTY: PasswordForm = { current: '', next: '', confirm: '' };
const IDS: Record<keyof PasswordForm, string> = { current: 'pw-cur', next: 'pw-new', confirm: 'pw-confirm' };

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const [form, setForm] = useState<PasswordForm>(EMPTY);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [serverMsg, setServerMsg] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicyConfig | null>(null);
  const wrap = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY); setErrors({}); setServerMsg({}); setNote('');
    let alive = true;
    fetch('/api/auth/password-policy')
      .then((r) => r.json())
      .then((d) => { if (alive) setPolicy(d.policy ?? DEFAULT_POLICY); })
      .catch(() => { if (alive) setPolicy(DEFAULT_POLICY); }); // như trang đổi mật khẩu V1: lỗi thì dùng mặc định
    return () => { alive = false; };
  }, [open]);

  const pol = policy ?? DEFAULT_POLICY;
  const checks = policyChecks(pol, form.next);

  function set(k: keyof PasswordForm, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    setServerMsg((s) => ({ ...s, [k]: undefined }));
    // gõ lại thì gỡ lỗi của ô đó (và lỗi "không khớp" khi đã khớp)
    setErrors((e) => {
      const out = { ...e, [k]: undefined };
      if (e.confirm === 'au.err.match' && next.confirm === next.next) out.confirm = undefined;
      if (k === 'next' && e.next === 'au.err.policy' && policyChecks(pol, v).every((c) => c.ok)) out.next = undefined;
      return out;
    });
  }

  const focus = (k: keyof PasswordForm) => wrap.current?.querySelector<HTMLInputElement>(`#${IDS[k]}`)?.focus();

  async function submit() {
    if (pending) return;
    const e = validatePasswordForm(form, pol);
    setErrors(e); setServerMsg({}); setNote('');
    const first = (['current', 'next', 'confirm'] as const).find((k) => e[k]);
    if (first) { focus(first); return; }
    setPending(true);
    try {
      const res = await fetch('/api/settings/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changePasswordPayload(form)),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const err = toApiError(body, 'Đổi mật khẩu thất bại', res.status);
        const hit = passwordServerError(err.code);
        if (hit) {
          setServerMsg({ [hit.field]: hit.key ? t(hit.key) : errMsg(err) });
          if (hit.field === 'current') setForm((f) => ({ ...f, current: '' }));
          focus(hit.field);
        } else {
          setNote(errMsg(err, 'Đổi mật khẩu thất bại'));
        }
        return;
      }
      toast.success(t('pf.pw.ok'));
      onClose();
      router.refresh();
    } catch (err) {
      setNote(errMsg(err, 'Lỗi kết nối, vui lòng thử lại'));
    } finally {
      setPending(false);
    }
  }

  const fieldErr = (k: keyof PasswordForm) => serverMsg[k] ?? (errors[k] ? t(errors[k]!) : undefined);

  return (
    <ActionDialog
      open={open}
      onClose={onClose}
      title={t('pf.pw.btn')}
      sub={t('pf.pw.sub')}
      size="sm"
      okLabel={t('pf.pw.btn')}
      onOk={submit}
      pending={pending}
      data-testid="pw-dialog"
    >
      <form ref={wrap} noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {note && <DialogNote tone="bad" className="mb-4">{note}</DialogNote>}
        <Field id={IDS.current} label={t('au.cur._')} optional={false} error={fieldErr('current')}>
          <PasswordInput value={form.current} onChange={(v) => set('current', v)} autoComplete="current-password" />
        </Field>
        <Field id={IDS.next} label={t('au.new._')} optional={false} error={fieldErr('next')}>
          <PasswordInput value={form.next} onChange={(v) => set('next', v)} autoComplete="new-password" extraDescribedBy="pw-pol-h" />
        </Field>
        <PasswordPolicyList id="pw-pol-h" checks={checks} bad={errors.next === 'au.err.policy'} loading={!policy} className="-mt-2 mb-4" />
        <Field id={IDS.confirm} label={t('au.new2._')} optional={false} error={fieldErr('confirm')}>
          <PasswordInput value={form.confirm} onChange={(v) => set('confirm', v)} autoComplete="new-password" />
        </Field>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ActionDialog>
  );
}
