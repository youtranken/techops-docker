'use client';

/**
 * Trang Hồ sơ của tôi (preview `profile.html`, A3-2) — dựng lại giao diện, giữ API/luật V1:
 *  - Tài khoản (chỉ đọc) · Ảnh đại diện (lưu ngay như V1) · Thông tin cơ bản · Liên hệ · Múi giờ + ngôn ngữ · Mật khẩu (hộp thoại).
 *  - Các ô nhập gom vào 1 StickySaveBar; khi Lưu gửi đúng body V1 (profilePayloads: cơ bản rồi liên hệ). Lỗi hiện dưới ô.
 */
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/shared/ui/States';
import { StickySaveBar } from '@/shared/ui/StickySaveBar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { resolveLocale } from '@/i18n/locale';
import { useProfile, useUpdateProfile } from '../../hooks/useProfile';
import {
  profileFormFrom, validateProfileForm, profilePayloads, isProfileDirty,
  type ProfileErrors, type ProfileField, type ProfileForm,
} from '../../lib/profile-form';
import { ProfileSection } from './ProfileSection';
import { ProfileAccountBlock } from './ProfileAccountBlock';
import { ProfileAvatarBlock } from './ProfileAvatarBlock';
import { ProfileBasicBlock, ProfileContactBlock, ProfilePrefBlock } from './ProfileFieldBlocks';
import { ChangePasswordDialog } from './ChangePasswordDialog';

const FIELD_ID: Record<ProfileField, string> = {
  displayName: 'pf-name', position: 'pf-pos', department: 'pf-dept', bio: 'pf-bio', timezone: 'pf-tz', email: 'pf-email', phone: 'pf-phone',
};
const ORDER: ProfileField[] = ['displayName', 'position', 'department', 'bio', 'email', 'phone', 'timezone'];

export function ProfilePage() {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  const errMsg = useErrorMessage();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const update = useUpdateProfile();
  const [base, setBase] = useState<ProfileForm | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const dirty = !!base && !!form && isProfileDirty(base, form);

  // Nạp / đồng bộ từ server khi chưa có thay đổi (vd sau khi đổi ảnh/màu)
  useEffect(() => {
    if (!profile || dirty || saving) return;
    const f = profileFormFrom(profile);
    setBase(f);
    setForm(f);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  function onChange(field: ProfileField, value: string) {
    setForm((f) => (f ? { ...f, [field]: value } : f));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function save() {
    if (!base || !form || saving) return;
    const e = validateProfileForm(form);
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) {
      document.getElementById(FIELD_ID[first])?.focus();
      return;
    }
    setSaving(true);
    try {
      for (const body of profilePayloads(base, form)) {
        await update.mutateAsync(body);
        toast.success(t('email' in body ? 'pf.saved.ct' : 'pf.saved.basic'));
        // phần đã lưu thành công không còn "chưa lưu" dù phần sau lỗi
        setBase((b) => (b ? { ...b, ...body } : b));
      }
    } catch (err) {
      toast.error(errMsg(err, 'Lỗi khi lưu'));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!base) return;
    setForm(base);
    setErrors({});
  }

  return (
    <div className="max-w-[1040px] pb-2">
      <div className="mb-4">
        <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('pf.title')}</h1>
        <p className="m-0 mt-1 text-[13px] text-ink-3">{t('pf.sub')}</p>
      </div>

      {isLoading ? (
        <ProfileSkeleton />
      ) : isError || !profile || !form ? (
        <div className="rounded-card border border-line bg-surface shadow-v2-1">
          <ErrorState title={t('pf.err.load.t')} description={t('pf.err.load.d')} onRetry={() => refetch()} className="py-14" />
        </div>
      ) : (
        <div aria-live="polite">
          <ProfileAccountBlock profile={profile} />
          <ProfileAvatarBlock profile={profile} displayName={base?.displayName ?? profile.displayName} locale={locale} />
          <ProfileBasicBlock form={form} errors={errors} onChange={onChange} />
          <ProfileContactBlock form={form} errors={errors} onChange={onChange} />
          <ProfilePrefBlock form={form} onChange={onChange} />
          <ProfileSection id="pw" title={t('pf.sec.t')} description={t('pf.sec.d')}>
            <Button type="button" variant="outline" size="md" onClick={() => setPwOpen(true)} className="max-[680px]:h-11" data-testid="pf-pw-btn">
              <KeyRound aria-hidden />
              {t('pf.pw.btn')}
            </Button>
          </ProfileSection>
          <StickySaveBar dirty={dirty} saving={saving} onSave={save} onReset={reset} message={t('pf.bar.msg')} saveText={t('pf.bar.save')} resetText={t('pf.bar.undo')} />
          <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
        </div>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  const t = useTranslations();
  return (
    <div aria-busy="true" data-testid="pf-skeleton">
      <span className="sr-only">{t('app.loading')}</span>
      {[1, 2, 3, 2].map((n, i) => (
        <div key={i} className="mb-4 grid grid-cols-[minmax(0,232px)_minmax(0,1fr)] gap-8 rounded-card border border-line bg-surface px-6 py-5 shadow-v2-1 max-[860px]:grid-cols-1 max-[860px]:gap-3.5 max-[860px]:px-4">
          <div className="grid content-start gap-2.5">
            <Skeleton variant="line" className="h-3.5 w-1/2" />
            <Skeleton variant="line" className="w-[85%]" />
          </div>
          <div className="grid content-start gap-2.5">
            {Array.from({ length: n }, (_, j) => <Skeleton key={j} variant="line" className="h-9" style={{ width: j % 2 ? '60%' : '100%' }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
