'use client';

/**
 * Khung khu Cài đặt (preview `settings.html`): đầu trang "Cài đặt" + nav con bên trái (≥1024) / ô chọn mục (≤1023).
 * Danh sách mục do server tính theo luật V1 (`settingsSections`). Trang Hồ sơ có khung riêng (A3-2) → không bọc.
 * Chuyển mục khi còn thay đổi chưa lưu → hỏi trước.
 */
import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { controlClass } from '@/shared/ui/Field';
import { activeSection, type SettingsSection } from '../../lib/settings-nav';
import { SettingsDirtyProvider, useSettingsDirtyState } from './SettingsDirty';

export function SettingsShell({ sections, employee, children }: { sections: SettingsSection[]; employee: boolean; children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/settings/profile')) return <>{children}</>;
  return (
    <SettingsDirtyProvider>
      <Inner sections={sections} employee={employee}>{children}</Inner>
    </SettingsDirtyProvider>
  );
}

function Inner({ sections, employee, children }: { sections: SettingsSection[]; employee: boolean; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname() ?? '';
  const tab = useSearchParams()?.get('tab') ?? null;
  const router = useRouter();
  const confirm = useConfirm();
  const { dirty, setDirty } = useSettingsDirtyState();
  const current = activeSection(pathname, tab);
  const groups = (['work', 'notif', 'sys'] as const).map((g) => ({ g, items: sections.filter((s) => s.group === g) })).filter((x) => x.items.length);
  const curLabel = current ? t(`set.s.${current}`) : '';

  async function go(href: string, key: string, e?: React.MouseEvent) {
    if (key === current) { e?.preventDefault(); return; }
    if (!dirty) return; // Link tự điều hướng
    e?.preventDefault();
    const ok = await confirm({ title: t('set.leave.t'), description: t('set.leave.d', { s: curLabel }), confirmText: t('set.leave.ok'), danger: true });
    if (ok) { setDirty(false); router.push(href); }
  }

  async function onSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const s = sections.find((x) => x.key === e.target.value);
    if (!s) return;
    if (!dirty) { router.push(s.href); return; }
    const ok = await confirm({ title: t('set.leave.t'), description: t('set.leave.d', { s: curLabel }), confirmText: t('set.leave.ok'), danger: true });
    if (ok) { setDirty(false); router.push(s.href); }
  }

  return (
    <div className="max-w-[1120px]">
      <div className="mb-5 max-[680px]:mb-4">
        <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('set.title')}</h1>
        <p className="m-0 mt-1 text-[13px] text-ink-3">{t('set.sub')}</p>
      </div>
      {sections.length > 0 && (
        <div className="mb-5 hidden max-[1023px]:block">
          <label htmlFor="set-nav-sel" className="mb-1.5 block text-[13px] font-medium text-ink">{t('set.nav.pick')}</label>
          <select id="set-nav-sel" className={cn(controlClass, 'h-[38px] max-w-[360px] max-[680px]:h-11')} value={current ?? ''} onChange={onSelect}>
            {current && !sections.some((s) => s.key === current) && <option value={current}>{curLabel}</option>}
            {groups.map(({ g, items }) => (
              <optgroup key={g} label={t(`set.g.${g}`)}>
                {items.map((s) => <option key={s.key} value={s.key}>{t(`set.s.${s.key}`)}{s.readOnly ? ` · ${t('set.ro.short')}` : ''}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <div className={cn(sections.length > 0 && 'grid grid-cols-[208px_minmax(0,1fr)] items-start gap-8 max-[1199px]:grid-cols-[184px_minmax(0,1fr)] max-[1199px]:gap-7 max-[1023px]:block')}>
        {sections.length > 0 && <nav aria-label={t('set.nav.label')} className="sticky top-[76px] max-[1023px]:hidden" data-testid="set-nav">
          {groups.map(({ g, items }, i) => (
            <React.Fragment key={g}>
              <div className={cn('px-2.5 pb-1.5 text-xs font-medium text-ink-3', i ? 'pt-4' : 'pt-0')}>{t(`set.g.${g}`)}</div>
              {items.map((s) => {
                const on = s.key === current;
                return (
                  <Link
                    key={s.key}
                    href={s.href}
                    aria-current={on ? 'page' : undefined}
                    onClick={(e) => go(s.href, s.key, e)}
                    className={cn(
                      'relative flex h-[34px] items-center gap-2 rounded-ctl px-2.5 text-sm font-medium text-ink-2 no-underline hover:bg-surface-2 hover:text-ink',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      on && 'bg-surface font-semibold text-ink shadow-v2-1 before:absolute before:bottom-[9px] before:left-0 before:top-[9px] before:w-0.5 before:rounded-sm before:bg-primary',
                    )}
                  >
                    <span className="truncate">{t(`set.s.${s.key}`)}</span>
                    {s.readOnly && <span className="ml-auto text-xs font-normal text-ink-3">{t('set.ro.short')}</span>}
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
          {employee && <p className="mx-2.5 mt-4 text-xs leading-normal text-ink-3">{t('set.nav.empNote')}</p>}
        </nav>}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
