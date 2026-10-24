'use client';

/**
 * Đặt lại mật khẩu qua link email (preview password.html?mode=reset). V1 giữ nguyên:
 *  - thiếu token → báo link không hợp lệ; có token → GET /api/auth/reset-password/check → {valid:false} thì ẩn form;
 *  - POST /api/auth/reset-password { token, newPassword }; xong → 3 giây tự về /login.
 * V2 thêm: lỗi mạng khi kiểm tra có nút Thử lại (gọi lại đúng API kiểm tra của V1).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, RefreshCw, WifiOff, XCircle } from 'lucide-react';
import { DialogNote } from '@/shared/ui/ActionDialog';
import { toApiError } from '@/lib/errors';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { DEFAULT_POLICY } from '@/modules/settings/lib/password-rules';
import { usePasswordPolicy } from '../hooks/usePasswordPolicy';
import {
  clearOnType, resetLinkState, resetPayload, resetServerError, validateResetForm,
  type NewPasswordErrors, type NewPasswordForm,
} from '../lib/auth-logic';
import { AuthResult, ResultLink, btnPrimary } from './AuthResult';
import { NewPasswordFields, NEW_IDS } from './NewPasswordFields';

const REDIRECT_SEC = 3; // V1: setTimeout(() => router.push('/login'), 3000)

export function ResetPassword() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const policy = usePasswordPolicy();
  const [check, setCheck] = useState<{ valid?: boolean } | 'net' | undefined>(undefined);
  const [expiredByServer, setExpiredByServer] = useState(false);
  const [form, setForm] = useState<NewPasswordForm>({ next: '', confirm: '' });
  const [errors, setErrors] = useState<NewPasswordErrors>({});
  const [serverNext, setServerNext] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const wrap = useRef<HTMLFormElement>(null);
  /** ô cần focus sau khi hết "đang lưu" (ô còn disabled lúc nhận lỗi server) */
  const focusAfter = useRef<keyof NewPasswordForm | null>(null);

  const runCheck = useCallback(() => {
    if (!token) return;
    setCheck(undefined);
    fetch(`/api/auth/reset-password/check?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setCheck({ valid: !!d.valid }))
      .catch(() => setCheck('net'));
  }, [token]);
  useEffect(runCheck, [runCheck]);

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) { router.push('/login'); return; }
    const id = setTimeout(() => setCount((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [count, router]);

  const state = expiredByServer ? 'expired' : resetLinkState(token, check);
  const focus = (k: keyof NewPasswordForm) => wrap.current?.querySelector<HTMLInputElement>(`#${NEW_IDS[k]}`)?.focus();
  useEffect(() => {
    if (!busy && focusAfter.current) { focus(focusAfter.current); focusAfter.current = null; }
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  const finished = count !== null;
  useEffect(() => { if (finished) document.getElementById('auT')?.focus(); }, [finished]);

  function set(k: keyof NewPasswordForm, v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    if (k === 'next') setServerNext('');
    setErrors((e) => clearOnType(e, k, next, policy ?? DEFAULT_POLICY));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = validateResetForm(form, policy ?? DEFAULT_POLICY);
    setErrors(v); setServerNext(''); setNote('');
    const first = (['next', 'confirm'] as const).find((k) => v[k]);
    if (first) { focus(first); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetPayload(token, form)),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const err = toApiError(body, 'Đặt lại mật khẩu thất bại', res.status);
        const where = resetServerError(err.code);
        if ('field' in where) { setServerNext(errMsg(err)); focusAfter.current = 'next'; }
        else if ('link' in where) setExpiredByServer(true);
        else setNote(errMsg(err, 'Đặt lại mật khẩu thất bại'));
        return;
      }
      setCount(REDIRECT_SEC);
    } catch (err) {
      setNote(errMsg(err, 'Lỗi kết nối, vui lòng thử lại'));
    } finally {
      setBusy(false);
    }
  }

  if (count !== null) {
    return (
      <AuthResult tone="ok" icon={CheckCircle2} title={t('au.reset.ok.t')} desc={<span aria-live="polite">{t('au.reset.ok.d', { n: Math.max(0, count) })}</span>} testId="reset-ok">
        <ResultLink href="/login" primary>{t('au.toLogin')}</ResultLink>
      </AuthResult>
    );
  }
  if (state === 'checking') return <AuthResult tone="busy" title={t('au.check')} testId="reset-checking" />;
  if (state === 'bad') {
    return (
      <AuthResult tone="bad" icon={XCircle} title={t('au.link.bad.t')} desc={t('au.link.bad.d')} testId="reset-bad">
        <ResultLink href="/login" primary>{t('au.toLogin')}</ResultLink>
      </AuthResult>
    );
  }
  if (state === 'expired') {
    return (
      <AuthResult tone="warn" icon={Clock} title={t('aux.link.exp.t')} desc={t('aux.link.exp.d')} testId="reset-expired">
        <ResultLink href="/login" primary>{t('au.toLogin')}</ResultLink>
      </AuthResult>
    );
  }
  if (state === 'net') {
    return (
      <AuthResult tone="bad" icon={WifiOff} title={t('au.link.net.t')} desc={t('au.link.net.d')} testId="reset-net">
        <button type="button" className={btnPrimary} onClick={runCheck}><RefreshCw aria-hidden className="size-4" />{t('app.retry')}</button>
        <ResultLink href="/login">{t('au.toLogin')}</ResultLink>
      </AuthResult>
    );
  }

  const err = (k: keyof NewPasswordForm) => (k === 'next' && serverNext) || (errors[k] ? t(errors[k]!) : undefined);
  return (
    <>
      <h1 id="auT" tabIndex={-1} className="m-0 mb-1.5 font-head text-xl font-semibold leading-[1.3] tracking-[-.015em] text-ink outline-none">{t('au.reset.t')}</h1>
      <p className="m-0 mb-[22px] text-sm text-ink-2">{t('aux.reset.d')}</p>
      {note && <div role="alert"><DialogNote tone="bad" className="mb-5 mt-0">{note}</DialogNote></div>}
      <form ref={wrap} method="post" noValidate onSubmit={submit}>
        <NewPasswordFields
          next={form.next}
          confirm={form.confirm}
          onNext={(v) => set('next', v)}
          onConfirm={(v) => set('confirm', v)}
          onConfirmBlur={() => { if (form.confirm && form.next && form.confirm !== form.next) setErrors((x) => ({ ...x, confirm: 'au.err.match' })); }}
          errNext={err('next')}
          errConfirm={err('confirm')}
          policyBad={errors.next === 'au.err.policy'}
          policy={policy}
          disabled={busy}
        />
        <button type="submit" disabled={busy} className={`${btnPrimary} mt-6`}>
          {busy && <span aria-hidden className="size-4 flex-none animate-spin rounded-full border-2 border-current/35 border-t-current" />}
          <span>{t(busy ? 'au.saving' : 'au.reset.btn')}</span>
        </button>
      </form>
    </>
  );
}
