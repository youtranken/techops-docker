'use client';

/**
 * Mục "Bảo mật" — cấu hình bảo mật HỆ THỐNG (preview `pSecurity`). API V1: GET/PUT/POST(reset) /api/settings/security (chỉ Admin).
 * Giữ V1: PUT gửi cả cấu hình (kể cả trường không hiện); "Đặt lại mặc định" GHI NGAY mặc định lên server như V1 (V2 chỉ hỏi
 * xác nhận trước); "Cho phép nhiều thiết bị" V1 lưu nhưng chưa áp dụng → vẫn cho đổi, gắn nhãn Phase B.
 * Giới hạn số theo zod route V1. Vai trò khác Admin: API 403 → báo không có quyền (V1 quay mãi).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Lock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/shared/ui/Field';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { PhaseBBadge } from '@/shared/ui/PhaseBBadge';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { cn } from '@/lib/utils';
import { useSecurityConfig } from '../../hooks/useSecurityConfig';
import {
  SECURITY_NUMS, getSecurityValue, securityBody, securityFormFrom, setSecurityValue, validateSecurity, type SecurityForm,
} from '../../lib/config-forms';
import type { FieldError } from '../../lib/catalog-forms';
import { CheckList } from '../shell/choices';
import { FormSkeleton, HeadTag, NoAccess, Note, PanelError, PanelHead, SettingsBlock, SwitchRow, httpStatus } from '../shell/parts';
import { useReportDirty } from '../shell/SettingsDirty';

const NUM_META: Record<string, { label: string; unit: string; hint: string }> = {
  'rateLimit.loginMaxAttempts': { label: 'set.sec.login', unit: 'set.u.times', hint: 'set.sec.loginH' },
  'rateLimit.lockoutMinutes': { label: 'set.sec.lock', unit: 'set.u.min', hint: 'set.sec.lockH' },
  'rateLimit.maxRequests': { label: 'set.sec.api', unit: 'set.u.rpm', hint: 'set.sec.apiH' },
  'passwordPolicy.minLength': { label: 'set.sec.minLen', unit: 'set.u.chars', hint: 'set.sec.minLenH' },
  'passwordPolicy.expiryDays': { label: 'set.sec.exp', unit: 'set.u.days', hint: 'set.sec.expH' },
  'session.idleTimeoutMinutes': { label: 'set.sec.idle', unit: 'set.u.min', hint: 'set.sec.idleH' },
  'session.maxSessionHours': { label: 'set.sec.max', unit: 'set.u.hours', hint: 'set.sec.maxH' },
};
const REQS = ['requireUppercase', 'requireLowercase', 'requireNumber', 'requireSpecialChar'] as const;

export function SecurityPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const confirm = useConfirm();
  const { config, isLoading, error, refetch, updateAsync, resetAsync, isUpdating, isResetting } = useSecurityConfig();
  const [base, setBase] = React.useState<SecurityForm | null>(null);
  const [form, setForm] = React.useState<SecurityForm | null>(null);
  const [errs, setErrs] = React.useState<Partial<Record<string, FieldError>>>({});
  const dirty = !!base && !!form && JSON.stringify(base) !== JSON.stringify(form);
  useReportDirty(dirty);

  React.useEffect(() => {
    if (!config || isUpdating || isResetting) return;
    const f = securityFormFrom(config);
    setBase(f);
    setForm(f);
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (path: string, v: unknown) => {
    setForm((f) => (f ? setSecurityValue(f, path, v) : f));
    if (errs[path]) setErrs((e) => ({ ...e, [path]: undefined }));
  };

  async function save() {
    if (!form) return;
    const e = validateSecurity(form);
    setErrs(e);
    const first = SECURITY_NUMS.find((n) => e[n.path]);
    if (first) {
      toast.error(t('set.v.fix', { n: Object.keys(e).length }));
      document.getElementById(`sec-${first.path.replace('.', '-')}`)?.focus();
      return;
    }
    try {
      const saved = await updateAsync(securityBody(form));
      const f = securityFormFrom(saved);
      setBase(f);
      setForm(f);
      toast.success(t('set.saved._', { s: t('set.s.security') }));
    } catch (err) {
      toast.error(errMsg(err, 'Không thể cập nhật cấu hình'));
    }
  }

  async function reset() {
    const ok = await confirm({ title: t('set.sec.resetQ'), description: t('setx.sec.resetD'), confirmText: t('set.sec.reset'), danger: true });
    if (!ok) return;
    try {
      const saved = await resetAsync();
      const f = securityFormFrom(saved);
      setBase(f);
      setForm(f);
      setErrs({});
      toast.success(t('setx.sec.resetDone'));
    } catch (err) {
      toast.error(errMsg(err, 'Không thể reset cấu hình'));
    }
  }

  const head = (actions?: React.ReactNode) => (
    <PanelHead title={t('set.s.security')} description={t('set.d.security')} tags={<HeadTag icon={Lock}>{t('set.adminOnly')}</HeadTag>} actions={actions} />
  );
  if (httpStatus(error) === 403) return <section aria-labelledby="set-panel-title">{head()}<NoAccess adminOnly /></section>;

  const num = (path: string) => {
    const n = SECURITY_NUMS.find((x) => x.path === path)!;
    const m = NUM_META[path];
    const id = `sec-${path.replace('.', '-')}`;
    const e = errs[path];
    return (
      <Field key={path} id={id} label={t(m.label)} optional={false} error={e ? t(e.key, e.values) : undefined} hint={`${t('set.range', { a: n.min, b: n.max })} · ${t(m.hint)}`}>
        <UnitInput unit={t(m.unit)} value={String(getSecurityValue(form!, path) ?? '')} onChange={(v) => set(path, v)} />
      </Field>
    );
  };

  return (
    <section aria-labelledby="set-panel-title">
      {head(
        <Button type="button" variant="outline" size="md" onClick={reset} disabled={!form || isResetting || isUpdating} data-testid="sec-reset">
          <RotateCcw aria-hidden />{t('set.sec.reset')}
        </Button>,
      )}
      {isLoading ? <FormSkeleton blocks={3} /> : error || !form ? <PanelError onRetry={() => refetch()} /> : (
        <div data-testid="sec-form">
          <Note tone="warn">{t('set.sec.warn')}</Note>
          <SettingsBlock id="sec-rl" title={t('set.sec.rl')} description={t('set.sec.rlH')}>
            <SwitchRow id="sec-rl-on" className="mb-4 border-b border-line pb-3.5" title={t('set.sec.rlOn')} hint={t('set.sec.rlOnH')} checked={form.rateLimit.enabled} onChange={(v) => set('rateLimit.enabled', v)} />
            <div className="grid grid-cols-2 gap-x-5 max-[680px]:grid-cols-1">
              {num('rateLimit.loginMaxAttempts')}
              {num('rateLimit.lockoutMinutes')}
              {num('rateLimit.maxRequests')}
            </div>
          </SettingsBlock>
          <SettingsBlock id="sec-pw" title={t('set.sec.pw')} description={t('set.sec.pwH')}>
            <div className="grid grid-cols-2 gap-x-5 max-[680px]:grid-cols-1">
              {num('passwordPolicy.minLength')}
              {num('passwordPolicy.expiryDays')}
            </div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink">{t('set.sec.req')}</span>
            <CheckList
              testId="sec-req"
              items={REQS.map((k) => ({ value: k, title: t(`set.sec.${k}._`), description: t(`set.sec.${k}.d`) }))}
              selected={REQS.filter((k) => form.passwordPolicy[k])}
              onToggle={(k) => set(`passwordPolicy.${k}`, !form.passwordPolicy[k as (typeof REQS)[number]])}
            />
          </SettingsBlock>
          <SettingsBlock id="sec-ss" title={t('set.sec.ss')} description={t('set.sec.ssH')}>
            <div className="grid grid-cols-2 gap-x-5 max-[680px]:grid-cols-1">
              {num('session.idleTimeoutMinutes')}
              {num('session.maxSessionHours')}
            </div>
            <SwitchRow
              id="sec-multi"
              className="border-t border-line pt-3.5"
              title={t('set.sec.multi')}
              badge={<PhaseBBadge />}
              hint={t('setx.sec.multiNote')}
              checked={form.session.allowMultipleSessions}
              onChange={(v) => set('session.allowMultipleSessions', v)}
            />
          </SettingsBlock>
          <StickySaveBar dirty={dirty} saving={isUpdating} onSave={save} onReset={() => { if (base) { setForm(base); setErrs({}); } }} message={t('set.dirty')} saveText={t('set.save')} resetText={t('set.undo')} />
        </div>
      )}
    </section>
  );
}

/** Ô số có đơn vị (preview `.unit`) — Field gắn id/aria vào ô */
function UnitInput({ unit, value, onChange, ...aria }: { unit: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <div className="flex items-center gap-2">
      <input {...aria} className={cn(inputClass, 'max-w-[132px] text-right font-mono')} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="whitespace-nowrap text-[13px] text-ink-2">{unit}</span>
    </div>
  );
}
