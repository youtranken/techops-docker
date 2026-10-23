'use client';

/** Khối Tài khoản (preview `pf.acc`): chỉ đọc — tên đăng nhập, vai trò, ngày tạo, mã tài khoản (V1 ProfileMeta: 8 ký tự đầu). */
import { useLocale, useTranslations } from 'next-intl';
import { ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/i18n/format';
import { resolveLocale } from '@/i18n/locale';
import type { UserProfileData } from '../../types';
import { ProfileSection } from './ProfileSection';

export function ProfileAccountBlock({ profile }: { profile: UserProfileData }) {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  const role = profile.role?.name ?? '';
  const rows: [string, string, boolean][] = [
    ['pf.acc.user', profile.username, true],
    ['pf.acc.role', ROLE_LABELS[role] ?? (role || '—'), false],
    ['pf.acc.created', profile.createdAt ? formatDate(profile.createdAt, locale) : '—', true],
    ['pf.acc.id', profile.id ? profile.id.slice(0, 8) : '—', true],
  ];
  return (
    <ProfileSection id="acc" title={t('pf.acc.t')} description={t('pf.acc.d')}>
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 max-[560px]:gap-x-4 max-[560px]:gap-y-3.5">
        {rows.map(([k, v, mono]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-ink-3">{t(k)}</dt>
            <dd className={mono ? 'm-0 mt-0.5 font-mono text-[13px] text-ink [overflow-wrap:anywhere]' : 'm-0 mt-0.5 text-sm font-medium text-ink'} data-testid={`pf-acc-${k.split('.').pop()}`}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </ProfileSection>
  );
}
