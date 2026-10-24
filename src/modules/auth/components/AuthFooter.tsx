'use client';

/** Chân trang xác thực: VI/EN (cookie NEXT_LOCALE như menu người dùng) · Sáng/Tối (next-themes) · bản quyền. */
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';
import { LOCALES, resolveLocale, type Locale } from '@/i18n/locale';
import { useSetLocale } from '@/i18n/useSetLocale';

export function AuthFooter() {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  const { setLocale } = useSetLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  const label = t(dark ? 'aux.theme.light' : 'aux.theme.dark');

  return (
    <footer className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-ink-3">
      <Segmented<Locale>
        ariaLabel={t('aux.lang')}
        size="sm"
        value={locale}
        onChange={(l) => { if (l !== locale) setLocale(l); }}
        options={LOCALES.map((l) => ({ value: l, label: t(`lang.${l}`), ariaLabel: t(`ui.lang.${l}`) }))}
      />
      <button
        type="button"
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label={`${t('au.theme')}: ${label}`}
        className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {dark ? <Sun aria-hidden className="size-3.5" /> : <Moon aria-hidden className="size-3.5" />}
        <span suppressHydrationWarning>{label}</span>
      </button>
      <span>{t('au.foot')}</span>
    </footer>
  );
}
