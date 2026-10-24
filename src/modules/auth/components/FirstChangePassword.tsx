'use client';

/**
 * Đổi mật khẩu lần đầu (middleware buộc vào khi mustChangePassword) — preview password.html?mode=first.
 * V1 giữ nguyên: chính sách từ /api/auth/password-policy; POST /api/settings/profile/change-password
 * { currentPassword, newPassword } (server kiểm lại: WRONG_PASSWORD, SAME_PASSWORD, PASSWORD_POLICY_VIOLATION, 5 lần/giờ).
 * Khác V1 (sửa lỗi): V1 xong thì router.push('/') nhưng phiên (JWT) vẫn mang mustChangePassword=true nên middleware
 * đẩy về lại /change-password — người dùng kẹt. V2 hiện "Đã đổi mật khẩu" + nút Đăng nhập lại (đăng xuất như menu V1).
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, LogOut } from 'lucide-react';
import { Field } from '@/shared/ui/Field';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { DialogNote } from '@/shared/ui/ActionDialog';
import { toApiError } from '@/lib/errors';
import { useErrorMessage } from '@/lib/useErrorMessage';
import {
  DEFAULT_POLICY, validatePasswordForm, changePasswordPayload, passwordServerError,
  type PasswordErrors, type PasswordForm,
} from '@/modules/settings/lib/password-rules';
import { usePasswordPolicy } from '../hooks/usePasswordPolicy';
import { logout } from '../lib/logout';
import { clearOnType } from '../lib/auth-logic';
import { AuthResult, btnPrimary } from './AuthResult';
import { NewPasswordFields, NEW_IDS } from './NewPasswordFields';

const IDS: Record<keyof PasswordForm, string> = { current: 'pw-cur', ...NEW_IDS };
const EMPTY: PasswordForm = { current: '', next: '', confirm: '' };

export function FirstChangePassword() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const policy = usePasswordPolicy();
  const pol = policy ?? DEFAULT_POLICY;
  const [form, setForm] = useState<PasswordForm>(EMPTY);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [serverMsg, setServerMsg] = useState<Partial<Record<keyof PasswordForm, string>>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wrap = useRef<HTMLFormElement>(null);
  /** ô cần focus sau khi hết "đang lưu" (ô còn disabled lúc nhận lỗi server) */
  const focusAfter = useRef<keyof PasswordForm | null>(null);
  const focus = (k: keyof PasswordForm) => wrap.current?.querySelector<HTMLInputElement>(`#${IDS[k]}`)?.focus();
  useEffect(() => {
    if (!busy && focusAfter.current) { focus(focusAfter.current); focusAfter.current = null; }
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (done) document.getElementById('auT')?.focus(); }, [done]);

  function set(k: keyof PasswordForm, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    setServerMsg((s) => ({ ...s, [k]: undefined }));
    setErrors((e) => clearOnType(e, k, next, pol));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = validatePasswordForm(form, pol);
    setErrors(v); setServerMsg({}); setNote('');
    const first = (['current', 'next', 'confirm'] as const).find((k) => v[k]);
    if (first) { focus(first); return; }
    setBusy(true);
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
          focusAfter.current = hit.field;
        } else {
          setNote(errMsg(err, 'Đổi mật khẩu thất bại'));
        }
        return;
      }
      setDone(true);
    } catch (err) {
      setNote(errMsg(err, 'Lỗi kết nối, vui lòng thử lại'));
    } finally {
      setBusy(false);
    }
  }

  async function signOutNow() {
    setLeaving(true);
    await logout();
  }

  if (done) {
    return (
      <AuthResult tone="ok" icon={CheckCircle2} title={t('au.first.ok.t')} desc={t('aux.first.ok.d')} testId="first-ok">
        <button type="button" className={btnPrimary} onClick={signOutNow} disabled={leaving}>{t('aux.first.ok.btn')}</button>
      </AuthResult>
    );
  }

  const fieldErr = (k: keyof PasswordForm) => serverMsg[k] ?? (errors[k] ? t(errors[k]!) : undefined);
  return (
    <>
      <h1 id="auT" className="m-0 mb-1.5 font-head text-xl font-semibold leading-[1.3] tracking-[-.015em] text-ink">{t('au.first.t')}</h1>
      <p className="m-0 mb-[22px] text-sm text-ink-2">{t('au.first.d')}</p>
      {note && <div role="alert"><DialogNote tone="bad" className="mb-5 mt-0">{note}</DialogNote></div>}
      <form ref={wrap} method="post" noValidate onSubmit={submit}>
        <Field id={IDS.current} label={t('au.cur._')} optional={false} error={fieldErr('current')}>
          <PasswordInput value={form.current} onChange={(v) => set('current', v)} autoComplete="current-password" disabled={busy} />
        </Field>
        <NewPasswordFields
          next={form.next}
          confirm={form.confirm}
          onNext={(v) => set('next', v)}
          onConfirm={(v) => set('confirm', v)}
          onConfirmBlur={() => { if (form.confirm && form.next && form.confirm !== form.next) setErrors((x) => ({ ...x, confirm: 'au.err.match' })); }}
          errNext={fieldErr('next')}
          errConfirm={fieldErr('confirm')}
          policyBad={errors.next === 'au.err.policy'}
          policy={policy}
          disabled={busy}
        />
        <button type="submit" disabled={busy} className={`${btnPrimary} mt-6`}>
          {busy && <span aria-hidden className="size-4 flex-none animate-spin rounded-full border-2 border-current/35 border-t-current" />}
          <span>{t(busy ? 'au.saving' : 'au.first.btn')}</span>
        </button>
      </form>
      <div className="mt-3.5 flex justify-center">
        <button
          type="button"
          onClick={signOutNow}
          disabled={leaving}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-sm px-1.5 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:min-h-11"
        >
          <LogOut aria-hidden className="size-3.5" />{t('au.signout')}
        </button>
      </div>
    </>
  );
}
