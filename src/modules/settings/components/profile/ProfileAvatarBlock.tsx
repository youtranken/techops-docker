'use client';

/**
 * Khối Ảnh đại diện (preview `pf.av`). Hành vi V1 (ProfileAvatar): chọn ảnh / màu là LƯU NGAY, không qua thanh Lưu.
 *  - Ảnh: JPEG/PNG ≤ 2 MB (checkAvatarFile) → POST /api/upload/avatar (route V1 tự ghi avatarUrl vào hồ sơ).
 *  - Màu: PATCH /api/settings/profile { avatarColor } — 10 màu V1 + màu tuỳ chọn.
 * Lỗi chọn tệp hiện ngay dưới nút (không dùng toast).
 */
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertCircle, Camera, Check, Loader2, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useUpdateProfile, useUploadAvatar } from '../../hooks/useProfile';
import { AVATAR_COLORS, DEFAULT_AVATAR_COLOR, checkAvatarFile } from '../../lib/profile-form';
import type { UserProfileData } from '../../types';
import { ProfileSection } from './ProfileSection';

function fmtSize(bytes: number, locale: 'vi' | 'en') {
  const mb = (bytes / 1048576).toFixed(1);
  return `${locale === 'vi' ? mb.replace('.', ',') : mb} MB`;
}

export function ProfileAvatarBlock({ profile, displayName, locale }: { profile: UserProfileData; displayName: string; locale: 'vi' | 'en' }) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const update = useUpdateProfile();
  const [fileErr, setFileErr] = useState('');
  const color = (profile.profile?.avatarColor ?? DEFAULT_AVATAR_COLOR).toUpperCase();
  const url = profile.profile?.avatarUrl ?? null;
  const custom = !AVATAR_COLORS.includes(color as (typeof AVATAR_COLORS)[number]);
  const busy = upload.isPending || update.isPending;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const bad = checkAvatarFile(file);
    if (bad) {
      setFileErr(t(bad.key, { f: file.name, s: fmtSize(file.size, locale) }));
      return;
    }
    setFileErr('');
    try {
      await upload.mutateAsync(file);
      toast.success(t('pf.saved.av'));
    } catch (err) {
      setFileErr(errMsg(err, 'Lỗi upload'));
    }
  }

  function pickColor(c: string) {
    if (c.toUpperCase() === color) return;
    update.mutate({ avatarColor: c }, {
      onSuccess: () => toast.success(t('pf.saved.color'), { id: 'pf-color' }),
      onError: (err) => toast.error(errMsg(err, 'Lỗi khi lưu')),
    });
  }

  return (
    <ProfileSection id="av" title={t('pf.av.t')} description={t('pf.av.d')}>
      <div className="mb-5 flex items-center gap-[18px] max-[560px]:items-start max-[560px]:gap-3.5">
        <UserAvatar
          displayName={displayName || 'U'}
          avatarUrl={url}
          avatarColor={color}
          className="!size-[72px] text-2xl shadow-[0_0_0_1px_var(--line)] max-[560px]:!size-[60px] [&>span]:!text-2xl max-[560px]:[&>span]:!text-xl"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              id="pf-file"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="peer sr-only"
              aria-describedby="pf-file-hint pf-file-err"
              aria-invalid={fileErr ? true : undefined}
              onChange={onFile}
              disabled={busy}
              data-testid="pf-file"
            />
            <label
              htmlFor="pf-file"
              className={cn(
                'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:border-line-2 hover:bg-surface-2 peer-focus-visible:ring-2 peer-focus-visible:ring-ring max-[680px]:h-11',
                busy && 'pointer-events-none opacity-60',
              )}
            >
              {upload.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Camera aria-hidden className="size-4" />}
              {t(url ? 'pf.av.change' : 'pf.av.up')}
            </label>
          </div>
          {busy && (
            <p role="status" className="m-0 mt-2 inline-flex items-center gap-1.5 text-xs text-ink-3">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />{t('au.saving')}
            </p>
          )}
          <p id="pf-file-hint" className="m-0 mt-2 text-xs text-ink-3">{t('pf.av.hint')} {t('pf.av.instant')}</p>
          {fileErr && (
            <p id="pf-file-err" role="alert" className="m-0 mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger" data-testid="pf-file-err">
              <AlertCircle aria-hidden className="mt-px size-3.5 flex-none" /><span>{fileErr}</span>
            </p>
          )}
        </div>
      </div>

      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={busy}>
        <legend className="mb-2 p-0 text-[13px] font-medium text-ink">{t('pf.av.color')}</legend>
        <div className="flex flex-wrap gap-2.5 max-[680px]:gap-2">
          {AVATAR_COLORS.map((c) => (
            <label key={c} className="relative grid size-7 cursor-pointer place-items-center rounded-full has-[:checked]:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-primary max-[680px]:size-9" style={{ background: c }}>
              <input type="radio" name="pf-avc" value={c} checked={color === c} onChange={() => pickColor(c)} className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0" />
              <span className="sr-only">{t('pf.av.swatch', { c })}</span>
              <Check aria-hidden className="pointer-events-none size-3.5 stroke-[3] text-white opacity-0 peer-checked:opacity-100" />
            </label>
          ))}
          <label
            title={t('pf.av.custom')}
            className={cn(
              'relative grid size-7 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-primary max-[680px]:size-9',
              custom ? 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]' : 'border-[1.5px] border-dashed border-line-2 bg-surface',
            )}
            style={custom ? { background: color } : undefined}
          >
            <input
              type="color"
              value={color.toLowerCase()}
              onChange={(e) => pickColor(e.target.value.toUpperCase())}
              className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
              aria-label={t('pf.av.custom')}
            />
            {custom ? <Check aria-hidden className="pointer-events-none size-3.5 stroke-[3] text-white" /> : <Palette aria-hidden className="pointer-events-none size-3.5 text-ink-3" />}
          </label>
        </div>
        <p className="m-0 mt-2.5 text-xs text-ink-3">{t('pf.av.colorHint')}</p>
      </fieldset>
    </ProfileSection>
  );
}
