'use client';

import { signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Menu, UserCircle, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { LOCALES, resolveLocale } from '@/i18n/locale';
import { useSetLocale } from '@/i18n/useSetLocale';

interface UserProfile {
  displayName: string;
  profile: { avatarColor: string; avatarUrl: string | null } | null;
}
interface HeaderProps {
  displayName: string;
  roleName: string;
  onSidebarToggle: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  BOSS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  EMPLOYEE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[1][0] + words[words.length - 1][0]).toUpperCase();
}

export function Header({ displayName, roleName, onSidebarToggle }: HeaderProps) {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  const { setLocale, pending: localePending } = useSetLocale();
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });


  const liveDisplayName = profile?.displayName ?? displayName;
  const avatarColor = profile?.profile?.avatarColor ?? '#2563eb';
  const avatarUrl = profile?.profile?.avatarUrl ?? null;

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout-log', { method: 'POST' });
    } catch {
      // non-blocking
    }
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onSidebarToggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors lg:hidden"
          aria-label={t('nav.open')}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-900 dark:text-white hidden sm:block">TechOps</span>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        {/* Theme toggle + Notification bell */}
        <ThemeToggle />
        <NotificationBell />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Avatar className="w-8 h-8">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={liveDisplayName} className="object-cover" />
                ) : null}
                <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white text-xs font-bold">
                  {getInitials(liveDisplayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{liveDisplayName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[roleName] ?? roleName}</span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="font-medium">{liveDisplayName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${ROLE_COLORS[roleName] ?? ''}`}>
                {ROLE_LABELS[roleName] ?? roleName}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="flex items-center gap-2 cursor-pointer">
                <UserCircle className="h-4 w-4" />
                {t('top.profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Ngôn ngữ (A1.3) — đặt tạm ở menu người dùng; A1-4 dựng lại khung */}
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <Languages aria-hidden className="h-3.5 w-3.5" />
              {t('ui.lang.label')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => { const next = resolveLocale(v); if (next !== locale) setLocale(next); }}
            >
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l} value={l} lang={l} disabled={localePending} className="cursor-pointer">
                  {t(`ui.lang.${l}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
            >
              {t('top.signout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
