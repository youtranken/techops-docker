'use client';

/**
 * Topbar V2 (preview `.top`): ☰ (mobile) · breadcrumb · chuông · menu người dùng.
 * Ô "tìm kiếm toàn cục" của preview KHÔNG làm (V1 không có API tìm chung) → Phase B.
 */
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Menu, UserCircle, Languages, LogOut, SunMoon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/lib/constants';
import { NotificationBell } from '@/modules/notifications/components/NotificationBell';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { LOCALES, resolveLocale } from '@/i18n/locale';
import { useSetLocale } from '@/i18n/useSetLocale';
import { Breadcrumbs } from './Breadcrumbs';

interface HeaderProps {
  displayName: string;
  roleName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  menuOpen: boolean;
  onMenuClick: () => void;
}

export function Header({ displayName, roleName, avatarUrl, avatarColor, menuOpen, onMenuClick }: HeaderProps) {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  const { setLocale, pending: localePending } = useSetLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const roleLabel = ROLE_LABELS[roleName] ?? roleName;

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout-log', { method: 'POST' });
    } catch {
      // non-blocking
    }
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] px-6 backdrop-blur-md max-lg:px-4 dark:bg-[color-mix(in_srgb,var(--canvas)_90%,transparent)]">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={t('nav.open')}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        className="-ml-2 grid size-9 shrink-0 place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu aria-hidden className="size-[18px]" />
      </button>

      <Breadcrumbs className="flex-1" />

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <NotificationBell showAdminNote={roleName === 'ADMIN'} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${t('app.account')}: ${displayName}`}
              className="grid rounded-full p-0.5 hover:ring-2 hover:ring-line-2 focus-visible:outline-2 focus-visible:outline-primary-text"
            >
              <UserAvatar displayName={displayName} avatarUrl={avatarUrl} avatarColor={avatarColor} size="md" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8} className="w-60 max-w-[calc(100vw-24px)] p-1.5">
            <DropdownMenuLabel className="mb-1 border-b border-pop-line px-2.5 pb-2.5 pt-2 font-normal">
              <b className="block truncate text-[13px] font-semibold text-ink">{displayName}</b>
              <span className="block text-xs text-ink-3">{roleLabel}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="min-h-9 cursor-pointer gap-2.5 px-2.5 text-sm">
              <Link href="/settings/profile">
                <UserCircle aria-hidden className="text-ink-3" />
                {t('top.profile')}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 px-2.5 text-xs font-normal text-ink-3">
              <Languages aria-hidden className="size-3.5" />
              {t('ui.lang.label')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => {
                const next = resolveLocale(v);
                if (next !== locale) setLocale(next);
              }}
            >
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l} value={l} lang={l} disabled={localePending} className="min-h-8 cursor-pointer">
                  {t(`ui.lang.${l}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-2 px-2.5 text-xs font-normal text-ink-3">
              <SunMoon aria-hidden className="size-3.5" />
              {t('top.appearance')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mounted ? (resolvedTheme ?? 'light') : ''} onValueChange={(v) => setTheme(v)}>
              <DropdownMenuRadioItem value="light" className="min-h-8 cursor-pointer">
                {t('top.theme.light')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="min-h-8 cursor-pointer">
                {t('top.theme.dark')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="min-h-9 cursor-pointer gap-2.5 px-2.5 text-sm text-danger focus:text-danger"
            >
              <LogOut aria-hidden />
              {t('top.signout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
