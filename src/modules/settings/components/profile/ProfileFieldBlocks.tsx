'use client';

/**
 * Các khối có ô nhập của Hồ sơ (preview `pf.basic`, `pf.ct`, `pf.pref`). Không tự lưu — thay đổi gom vào StickySaveBar của trang.
 * Ngôn ngữ giao diện là thuần client (cookie NEXT_LOCALE, như menu người dùng): đổi là áp dụng ngay.
 */
import { useLocale, useTranslations } from 'next-intl';
import { Field, inputClass, textareaClass, controlClass } from '@/shared/ui/Field';
import { cn } from '@/lib/utils';
import { LOCALES, resolveLocale } from '@/i18n/locale';
import { useSetLocale } from '@/i18n/useSetLocale';
import { TIMEZONES, TIMEZONE_KEY, type ProfileErrors, type ProfileField, type ProfileForm } from '../../lib/profile-form';
import { ProfileSection } from './ProfileSection';

interface Props {
  form: ProfileForm;
  errors: ProfileErrors;
  onChange: (field: ProfileField, value: string) => void;
}

const grid = 'grid grid-cols-2 gap-x-4 max-[560px]:grid-cols-1';
const selectClass = cn(controlClass, 'h-[38px] max-[680px]:h-11');

export function ProfileBasicBlock({ form, errors, onChange }: Props) {
  const t = useTranslations();
  const err = (f: ProfileField) => (errors[f] ? t(errors[f]!) : undefined);
  return (
    <ProfileSection id="basic" title={t('pf.basic.t')} description={t('pf.basic.d')}>
      <div className={grid}>
        <Field id="pf-name" label={t('pf.name._')} required error={err('displayName')} className="col-span-full">
          <input className={inputClass} value={form.displayName} maxLength={100} autoComplete="name" onChange={(e) => onChange('displayName', e.target.value)} />
        </Field>
        <Field id="pf-pos" label={t('pf.pos._')} error={err('position')} optional={false}>
          <input className={inputClass} value={form.position} maxLength={100} placeholder={t('pf.pos.ph')} autoComplete="organization-title" onChange={(e) => onChange('position', e.target.value)} />
        </Field>
        <Field id="pf-dept" label={t('pf.dept._')} error={err('department')} optional={false}>
          <input className={inputClass} value={form.department} maxLength={100} placeholder={t('pf.dept.ph')} onChange={(e) => onChange('department', e.target.value)} />
        </Field>
        <Field
          id="pf-bio"
          label={t('pf.bio._')}
          error={err('bio')}
          className="col-span-full"
          hint={<span className="flex justify-end font-mono">{form.bio.length}/500</span>}
        >
          <textarea className={cn(textareaClass, 'min-h-[84px]')} rows={3} value={form.bio} maxLength={500} placeholder={t('pf.bio.ph')} onChange={(e) => onChange('bio', e.target.value)} />
        </Field>
      </div>
    </ProfileSection>
  );
}

export function ProfileContactBlock({ form, errors, onChange }: Props) {
  const t = useTranslations();
  return (
    <ProfileSection id="ct" title={t('pf.ct.t')} description={t('pf.ct.d')}>
      <div className={grid}>
        <Field id="pf-email" label={t('pf.email._')} error={errors.email ? t(errors.email) : undefined} optional={false}>
          <input className={cn(inputClass, 'font-mono text-[13px]')} type="email" value={form.email} autoComplete="email" placeholder="ten@pmh.com.vn" onChange={(e) => onChange('email', e.target.value)} />
        </Field>
        <Field id="pf-phone" label={t('pf.phone._')} error={errors.phone ? t(errors.phone) : undefined} optional={false}>
          <input className={inputClass} type="tel" value={form.phone} maxLength={20} autoComplete="tel" placeholder="0912 345 678" onChange={(e) => onChange('phone', e.target.value)} />
        </Field>
      </div>
    </ProfileSection>
  );
}

export function ProfilePrefBlock({ form, onChange }: Omit<Props, 'errors'>) {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  const { setLocale, pending } = useSetLocale();
  // giá trị lạ (dữ liệu cũ) vẫn hiện được, không bị đổi ngầm
  const tzs: string[] = TIMEZONES.includes(form.timezone as (typeof TIMEZONES)[number]) ? [...TIMEZONES] : [form.timezone, ...TIMEZONES];
  return (
    <ProfileSection id="pref" title={t('pf.pref.t')} description={t('pf.pref.d')}>
      <div className={grid}>
        <Field id="pf-tz" label={t('pf.tz._')} optional={false}>
          <select className={selectClass} value={form.timezone} onChange={(e) => onChange('timezone', e.target.value)}>
            {tzs.map((z) => <option key={z} value={z}>{TIMEZONE_KEY[z] ? t(TIMEZONE_KEY[z]) : z}</option>)}
          </select>
        </Field>
        <Field id="pf-lang" label={t('pf.lang._')} optional={false} hint={t('pfx.lang.hint')}>
          <select
            className={selectClass}
            value={locale}
            disabled={pending}
            onChange={(e) => { const next = resolveLocale(e.target.value); if (next !== locale) setLocale(next); }}
          >
            {LOCALES.map((l) => <option key={l} value={l} lang={l}>{t(`pf.lang.${l}`)}</option>)}
          </select>
        </Field>
      </div>
    </ProfileSection>
  );
}
