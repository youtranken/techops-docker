'use client';

/**
 * Cấu hình SMTP (preview `pSmtp`). API V1: GET/PUT /api/settings/smtp, POST /api/settings/smtp/test (chỉ Admin).
 * Giữ V1: PUT gửi nguyên form (mật khẩu trống = giữ mật khẩu đang lưu; ô mật khẩu luôn trống, server chỉ trả bản che);
 * Kiểm tra kết nối gửi email thử tới người dùng có email, dùng cấu hình ĐÃ LƯU; bấm được khi đã có cấu hình như V1.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, inputClass, controlClass } from '@/shared/ui/Field';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { useSmtpConfig, useTestSmtp, useUpdateSmtpConfig } from '../../hooks/useSmtp';
import { useUsersWithEmail } from '../../hooks/useUsersWithEmail';
import { smtpBody, smtpFormFrom, smtpStatus, validateSmtp, type SmtpField, type SmtpForm } from '../../lib/config-forms';
import type { FieldError } from '../../lib/catalog-forms';
import { Dot, FormSkeleton, HeadTag, PanelError, PanelHead, SettingsBlock, SwitchRow } from '../shell/parts';
import { useReportDirty } from '../shell/SettingsDirty';

const ORDER: SmtpField[] = ['host', 'port', 'user', 'password', 'fromName', 'fromEmail'];

export function SmtpConfigPanel() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const { data: config, isLoading, isError, refetch } = useSmtpConfig();
  const update = useUpdateSmtpConfig();
  const [base, setBase] = React.useState<SmtpForm | null>(null);
  const [form, setForm] = React.useState<SmtpForm | null>(null);
  const [errs, setErrs] = React.useState<Partial<Record<SmtpField, FieldError>>>({});
  const [showPw, setShowPw] = React.useState(false);
  const configured = !!config;
  const dirty = !!base && !!form && JSON.stringify(base) !== JSON.stringify(form);
  useReportDirty(dirty);

  React.useEffect(() => {
    if (isLoading || isError || update.isPending) return;
    const f = smtpFormFrom(config ?? null);
    setBase(f);
    setForm(f);
  }, [config, isLoading, isError]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof SmtpForm>(k: K, v: SmtpForm[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    if (k in errs) setErrs((e) => ({ ...e, [k]: undefined }));
  };
  const msg = (k: SmtpField) => (errs[k] ? t(errs[k]!.key, errs[k]!.values) : undefined);

  async function save() {
    if (!form) return;
    const e = validateSmtp(form, configured);
    setErrs(e);
    const first = ORDER.find((k) => e[k]);
    if (first) {
      toast.error(t('set.v.fix', { n: Object.keys(e).length }));
      document.getElementById(`sm-${first}`)?.focus();
      return;
    }
    try {
      await update.mutateAsync(smtpBody(form));
      setShowPw(false);
      const f = { ...form, password: '' };
      setBase(f);
      setForm(f);
      toast.success(t('set.saved._', { s: t('set.s.smtp') }));
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi lưu SMTP'));
    }
  }

  const st = smtpStatus(config);
  const tag = isLoading || isError ? undefined : (
    <Dot tone={st === 'ok' ? 'done' : st === 'paused' ? 'review' : 'off'}>{t(st === 'ok' ? 'set.sm.ok' : st === 'paused' ? 'set.sm.paused' : 'set.sm.none')}</Dot>
  );

  return (
    <section aria-labelledby="set-panel-title">
      <PanelHead title={t('set.s.smtp')} description={t('set.d.smtp')} tags={<><HeadTag icon={Lock}>{t('set.adminOnly')}</HeadTag>{tag}</>} />
      {isLoading ? <FormSkeleton blocks={3} /> : isError || !form ? <PanelError onRetry={() => refetch()} /> : (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate autoComplete="off" data-testid="sm-form">
          <SettingsBlock id="sm-server" title={t('set.sm.server')}>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-x-5 max-[680px]:grid-cols-1">
              <Field id="sm-host" label={t('set.sm.host')} required error={msg('host')}>
                <input className={cn(inputClass, 'font-mono text-[13px]')} value={form.host} placeholder="smtp.office365.com" onChange={(e) => set('host', e.target.value)} />
              </Field>
              <Field id="sm-port" label={t('set.sm.port')} required error={msg('port')}>
                <input className={cn(inputClass, 'font-mono text-[13px]')} inputMode="numeric" value={form.port} placeholder="587" onChange={(e) => set('port', e.target.value)} />
              </Field>
            </div>
            <SwitchRow id="sm-secure" className="border-t border-line pt-3.5" title={t('set.sm.ssl')} hint={t(form.secure ? 'set.sm.sslOn' : 'set.sm.sslOff')} checked={form.secure} onChange={(v) => set('secure', v)} />
          </SettingsBlock>

          <SettingsBlock id="sm-auth" title={t('set.sm.auth')}>
            <div className="grid grid-cols-2 gap-x-5 max-[680px]:grid-cols-1">
              <Field id="sm-user" label={t('set.sm.user')} required error={msg('user')}>
                <input className={inputClass} type="email" autoComplete="off" value={form.user} onChange={(e) => set('user', e.target.value)} />
              </Field>
              <Field id="sm-password" label={t('set.sm.pass')} required={!configured} optional={false} error={msg('password')} hint={t(configured ? 'set.sm.passKeep' : 'set.sm.passNew')}>
                <PasswordBox value={form.password} show={showPw} onToggle={() => setShowPw((v) => !v)} onChange={(v) => set('password', v)} placeholder={configured ? '••••••••' : ''} />
              </Field>
            </div>
          </SettingsBlock>

          <SettingsBlock id="sm-sender" title={t('set.sm.sender')}>
            <div className="grid grid-cols-2 gap-x-5 max-[680px]:grid-cols-1">
              <Field id="sm-fromName" label={t('set.sm.fromName')} required error={msg('fromName')}>
                <input className={inputClass} value={form.fromName} placeholder="TechOps" onChange={(e) => set('fromName', e.target.value)} />
              </Field>
              <Field id="sm-fromEmail" label={t('set.sm.fromEmail')} required error={msg('fromEmail')}>
                <input className={inputClass} type="email" value={form.fromEmail} placeholder="noreply@pmh.com.vn" onChange={(e) => set('fromEmail', e.target.value)} />
              </Field>
            </div>
            <SwitchRow id="sm-active" className="border-t border-line pt-3.5" title={t('set.sm.active')} hint={t('set.sm.activeH')} checked={form.isActive} onChange={(v) => set('isActive', v)} />
          </SettingsBlock>

          <SmtpTest configured={configured} dirty={dirty} />
          <button type="submit" hidden aria-hidden tabIndex={-1} />
          <StickySaveBar dirty={dirty} saving={update.isPending} onSave={save} onReset={() => { if (base) { setForm(base); setErrs({}); setShowPw(false); } }} message={t('set.dirty')} saveText={t('set.save')} resetText={t('set.undo')} />
        </form>
      )}
    </section>
  );
}

/** Ô mật khẩu có nút hiện/ẩn (chỉ hiện chữ người dùng vừa gõ — server không bao giờ trả mật khẩu) */
function PasswordBox({ value, show, onToggle, onChange, placeholder, ...aria }: {
  value: string; show: boolean; onToggle: () => void; onChange: (v: string) => void; placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const t = useTranslations();
  return (
    <div className="relative">
      <input {...aria} className={cn(inputClass, 'pr-[42px]')} type={show ? 'text' : 'password'} autoComplete="new-password" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={onToggle} aria-pressed={show} aria-label={t(show ? 'set.pw.hide' : 'set.pw.show')} className="absolute right-0.5 top-px grid h-9 w-[34px] place-items-center rounded-md text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-[42px]">
        {show ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
}

/** Kiểm tra kết nối — V1: POST { testEmail } tới người dùng có email; kết quả hiện ngay dưới (và báo nhanh) */
function SmtpTest({ configured, dirty }: { configured: boolean; dirty: boolean }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const { data: users = [] } = useUsersWithEmail();
  const test = useTestSmtp();
  const [to, setTo] = React.useState('');
  const [res, setRes] = React.useState<{ ok: boolean; text: string } | null>(null);
  const target = users.find((u) => u.id === to);

  async function go() {
    if (!target) return;
    setRes(null);
    try {
      await test.mutateAsync(target.email);
      const now = new Date();
      setRes({ ok: true, text: t('set.sm.okRes', { e: target.email, t: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` }) });
    } catch (err) {
      setRes({ ok: false, text: errMsg(err, 'Lỗi kết nối SMTP') });
    }
  }

  return (
    <SettingsBlock id="sm-test" title={t('set.sm.test')} description={t('set.sm.testH')}>
      <div className="flex items-end gap-2.5 max-[680px]:flex-col max-[680px]:items-stretch">
        <Field id="sm-test-to" label={t('set.sm.testTo')} optional={false} className="mb-0 min-w-0 flex-1">
          <select className={cn(controlClass, 'h-[38px] max-[680px]:h-11')} value={to} disabled={!configured || test.isPending} onChange={(e) => { setTo(e.target.value); setRes(null); }}>
            <option value="">{t('setx.sm.pickTo')}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName} · {u.email}</option>)}
          </select>
        </Field>
        <Button type="button" variant="outline" size="md" onClick={go} disabled={!configured || !target || test.isPending} className="max-[680px]:h-11" data-testid="sm-test-btn">
          <Wifi aria-hidden />{t(test.isPending ? 'set.sm.testing' : 'set.sm.testBtn')}
        </Button>
      </div>
      {(!configured || dirty) && <p className="m-0 mt-1.5 text-xs text-ink-3">{t(!configured ? 'set.sm.testNeedConf' : 'set.testDirty')}</p>}
      <div role="status" aria-live="polite" data-testid="sm-test-res">
        {res && (
          <p className={cn('m-0 mt-3 flex items-start gap-2 text-[13px]', res.ok ? 'text-ink-2' : 'text-danger')}>
            <span aria-hidden className={cn('mt-1.5 size-2 flex-none rounded-full', res.ok ? 'bg-c-done' : 'bg-danger')} />
            <span>{res.ok ? res.text : <><b className="font-medium">{t('set.sm.badT')}</b> {res.text}</>}</span>
          </p>
        )}
      </div>
    </SettingsBlock>
  );
}
