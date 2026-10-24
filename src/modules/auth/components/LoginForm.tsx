'use client';

/**
 * Đăng nhập (preview login.html). Nghiệp vụ V1 giữ nguyên:
 *  - signIn('credentials', { username, password, redirect:false }) — payload ở lib/auth-logic.ts;
 *  - MỌI lần lỗi → 1 câu chung "Sai tên đăng nhập hoặc mật khẩu" (server không phân biệt sai mật khẩu / không có user /
 *    bị vô hiệu hoá / IP đang bị khoá 15 phút sau 5 lần sai) — chống dò tài khoản;
 *  - thành công → router.push(callbackUrl) + refresh. callbackUrl đã lọc chỉ còn đường dẫn nội bộ (trang login, server).
 * "Quên mật khẩu?" chỉ hiện hướng dẫn nhờ Admin gửi link (V1 không có tự phục vụ, không gọi API).
 */
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';
import { Field, inputClass } from '@/shared/ui/Field';
import { PasswordInput } from '@/shared/ui/PasswordInput';
import { DialogNote } from '@/shared/ui/ActionDialog';
import { loginOutcome, loginPayload, validateLogin, type LoginErrors, type LoginForm as Form } from '../lib/auth-logic';
import { btnPrimary } from './AuthResult';

export function LoginForm({ callbackUrl = '/' }: { callbackUrl?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [form, setForm] = useState<Form>({ username: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const wrap = useRef<HTMLFormElement>(null);
  const focus = (id: string) => wrap.current?.querySelector<HTMLInputElement>(`#${id}`)?.focus();

  function set(k: keyof Form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = validateLogin(form);
    setErrors(v);
    if (v.username || v.password) { focus(v.username ? 'username' : 'password'); return; }
    setNote('');
    setBusy(true);
    let r: Parameters<typeof loginOutcome>[0];
    try {
      r = await signIn('credentials', loginPayload(form));
    } catch {
      r = 'throw';
    }
    const out = loginOutcome(r);
    if (out.kind === 'ok') {
      router.push(callbackUrl);
      router.refresh();
      return; // giữ trạng thái "Đang đăng nhập…" tới khi chuyển trang
    }
    flushSync(() => { // vẽ lại ngay để ô hết disabled rồi mới focus
      setBusy(false);
      setNote(t(out.key));
      setForm((f) => ({ ...f, password: '' }));
    });
    focus('password');
  }

  return (
    <>
      <h1 id="auT" className="m-0 mb-1.5 font-head text-xl font-semibold leading-[1.3] tracking-[-.015em] text-ink">{t('au.login.t')}</h1>
      <p className="m-0 mb-[22px] text-sm text-ink-2">{t('au.login.d')}</p>
      {note && (
        <div role="alert" data-testid="login-error">
          <DialogNote tone="bad" className="mb-5 mt-0 font-semibold">{note}</DialogNote>
        </div>
      )}
      <form ref={wrap} method="post" noValidate onSubmit={submit}>
        <Field id="username" label={t('au.user._')} optional={false} error={errors.username ? t(errors.username) : undefined}>
          <input
            name="username"
            type="text"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={t('au.user.ph')}
            disabled={busy}
            className={inputClass}
          />
        </Field>
        <Field
          id="password"
          label={t('au.pass._')}
          optional={false}
          error={errors.password ? t(errors.password) : undefined}
          aside={(
            <button
              type="button"
              onClick={() => setForgot((x) => !x)}
              aria-expanded={forgot}
              aria-controls="forgotNote"
              className="-mr-1 mb-1.5 rounded-sm px-1 py-0.5 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('au.forgot._')}
            </button>
          )}
        >
          <PasswordInput name="password" value={form.password} onChange={(v) => set('password', v)} autoComplete="current-password" disabled={busy} />
        </Field>
        <div id="forgotNote" hidden={!forgot}>
          <DialogNote tone="info" icon={KeyRound} className="mt-0">{t('au.forgot.d')}</DialogNote>
        </div>
        <button type="submit" disabled={busy} className={`${btnPrimary} mt-6`} aria-live="polite">
          {busy && <span aria-hidden className="size-4 flex-none animate-spin rounded-full border-2 border-current/35 border-t-current" />}
          <span>{t(busy ? 'au.submitting' : 'au.submit')}</span>
        </button>
      </form>
    </>
  );
}
