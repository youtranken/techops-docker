'use client';

/**
 * Tạo người dùng (preview people `createDlg`) — chỉ ADMIN (V1). Hai cách như V1: đặt mật khẩu ngay / gửi link thiết lập.
 * Luật nhập + body POST giữ V1 (people-forms.ts). Lỗi máy chủ (trùng tên, chính sách mật khẩu…) hiện trong hộp.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ActionDialog, DialogNote } from '@/shared/ui/ActionDialog';
import { Field, inputClass } from '@/shared/ui/Field';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { useCreateUser } from '../../hooks/useCreateUser';
import { useRoles } from '../../hooks/useRoles';
import { useRoleLabel } from '../../../shared/HrPageHead';
import { createPayload, validateCreate, EMPTY_CREATE, type CreateField, type CreateMode, type CreateValues } from '../../view/people-forms';
import { PasswordChecklist, usePasswordPolicy } from './PasswordChecklist';

export function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const roleLabel = useRoleLabel();
  const { data: roles = [] } = useRoles();
  const create = useCreateUser();
  const policy = usePasswordPolicy(open);
  const [v, setV] = React.useState<CreateValues>(EMPTY_CREATE);
  const [mode, setMode] = React.useState<CreateMode>('password');
  const [tried, setTried] = React.useState(false);
  const [srv, setSrv] = React.useState<string | null>(null);

  React.useEffect(() => { if (open) { setV(EMPTY_CREATE); setMode('password'); setTried(false); setSrv(null); } }, [open]);
  const errs = tried ? validateCreate(v, mode) : {};
  const err = (k: CreateField) => (errs[k] ? t(errs[k]!) : undefined);
  const set = (k: CreateField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function submit() {
    setTried(true);
    setSrv(null);
    const e = validateCreate(v, mode);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="pp-create"] [aria-invalid="true"]')?.focus());
      return;
    }
    try {
      const r = await create.mutateAsync(createPayload(v, mode));
      onClose();
      if (r.warning) toast.warning(errMsg(r.warning));
      else toast.success(mode === 'link' ? t('pp.t.createdLink', { e: v.email }) : t('pp.t.created', { n: v.displayName }));
    } catch (e) {
      setSrv(errMsg(e, 'Đã xảy ra lỗi'));
    }
  }

  const way = (m: CreateMode, title: string, desc: string) => (
    <label className={cn('flex cursor-pointer items-start gap-2.5 rounded-ctl border border-line-2 px-3 py-2.5', mode === m && 'border-primary bg-[color-mix(in_srgb,var(--primary-soft)_55%,var(--surface))]')}>
      <input type="radio" name="pp-create-way" value={m} checked={mode === m} onChange={() => { setMode(m); setSrv(null); }} className="mt-[3px] flex-none accent-[var(--primary)]" />
      <span><b className="block text-sm font-medium text-ink">{title}</b><span className="mt-px block text-xs text-ink-3">{desc}</span></span>
    </label>
  );

  return (
    <ActionDialog open={open} onClose={onClose} title={t('pp.c.title')} okLabel={t(mode === 'link' ? 'pp.c.okLink' : 'pp.c.ok')} onOk={submit} pending={create.isPending} data-testid="pp-create">
      <Field id="pp-c-user" label={t('pp.f.user')} required hint={t('pp.f.userHint')} error={err('username')}>
        <input className={cn(inputClass, 'font-mono text-[13px]')} value={v.username} onChange={set('username')} autoComplete="off" placeholder="nvan" />
      </Field>
      <Field id="pp-c-name" label={t('pp.f.name')} required error={err('displayName')}>
        <input className={inputClass} value={v.displayName} onChange={set('displayName')} placeholder={t('pp.f.namePh')} />
      </Field>
      <Field id="pp-c-role" label={t('pp.col.role')} required error={err('roleId')}>
        <select className={inputClass} value={v.roleId} onChange={set('roleId')}>
          <option value="">{t('pp.f.pickRole')}</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r.name)}</option>)}
        </select>
      </Field>
      <fieldset className="m-0 mb-4 grid gap-2 border-0 p-0">
        <legend className="mb-1.5 p-0 text-[13px] font-medium text-ink">{t('pp.c.how')}</legend>
        {way('password', t('pp.c.wPw'), t('pp.c.wPwD'))}
        {way('link', t('pp.c.wLink'), t('ppx.c.wLinkD'))}
      </fieldset>
      <Field id="pp-c-email" label={t('pp.f.email')} required={mode === 'link'} error={err('email')}>
        <input type="email" className={inputClass} value={v.email} onChange={set('email')} placeholder="ten.ho@pmh.com.vn" autoComplete="off" />
      </Field>
      {mode === 'password' && (
        <>
          <Field id="pp-c-pw" label={t('pp.f.pw')} required error={err('password')} hint={t('pp.pw.src')} className="mb-0">
            <input type="password" className={inputClass} value={v.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <PasswordChecklist id="pp-c-pwc" policy={policy} value={v.password} />
          <div className="h-4" />
          <Field id="pp-c-pw2" label={t('pp.f.pw2')} required error={err('confirmPassword')}>
            <input type="password" className={inputClass} value={v.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
          </Field>
        </>
      )}
      {srv && <div role="alert"><DialogNote tone="bad">{srv}</DialogNote></div>}
    </ActionDialog>
  );
}
