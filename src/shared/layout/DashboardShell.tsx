'use client';

/**
 * Khung app V2 (preview ds-v2 `App.shell`): sidebar + topbar + vùng nội dung trên nền canvas.
 * - Desktop (≥1024): sidebar cố định 240px, thu gọn 64px; trạng thái thu gọn nhớ bằng cookie `sb_collapsed`
 *   (đọc ở server → không nháy khi tải trang).
 * - ≤1023: sidebar thành ngăn kéo có nền mờ; Esc / bấm nền / đổi trang → tự đóng.
 * - Nội dung: padding theo --content-px (24 / 16 ≤1023) — lớp `.v2-content` trong globals.css.
 */
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMyPermissions } from '@/shared/hooks/useMyPermissions';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { buildNav } from './nav/nav-model';
import { useAutoClose } from './nav/useAutoClose';

export const SIDEBAR_COOKIE = 'sb_collapsed';

interface UserProfile {
  displayName: string;
  profile: { avatarColor: string; avatarUrl: string | null } | null;
}

interface DashboardShellProps {
  children: React.ReactNode;
  displayName: string;
  roleName: string;
  initialCollapsed?: boolean;
}

/** ≤1023px: ngăn kéo (khớp breakpoint `lg` của Tailwind) */
function useIsDrawer() {
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const on = () => setDrawer(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return drawer;
}

export function DashboardShell({ children, displayName, roleName, initialCollapsed = false }: DashboardShellProps) {
  const t = useTranslations();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawer = useIsDrawer();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  const closeDrawer = useCallback(() => setMobileOpen(false), []);
  useAutoClose(mobileOpen, closeDrawer, `${pathname}?${search}`);

  // Khoá cuộn trang khi ngăn kéo mở
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);
  // Rời chế độ ngăn kéo (xoay/phóng to cửa sổ) → đóng
  useEffect(() => { if (!drawer) setMobileOpen(false); }, [drawer]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  // Hồ sơ (tên/ảnh mới nhất) — như Header V1
  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });
  const liveName = profile?.displayName ?? displayName;
  const avatarUrl = profile?.profile?.avatarUrl ?? null;
  const avatarColor = profile?.profile?.avatarColor ?? '#2563eb';

  // Quyền menu (V1: /api/hr/sidebar-permissions) → buildNav giữ nguyên luật lọc V1
  const { data: session } = useSession();
  const role = roleName || session?.user?.role?.name || '';
  const perms = useMyPermissions();
  const groups = buildNav({ role, perms: perms.data, loaded: perms.settled });
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <a
        href="#content"
        className="fixed left-3 top-3 z-[100] -translate-y-[300%] rounded-ctl bg-surface px-3 py-2 font-medium text-ink no-underline shadow-v2-pop focus:translate-y-0"
      >
        {t('app.skip')}
      </a>

      {/* Nền mờ ngăn kéo */}
      <div
        aria-hidden
        onClick={closeDrawer}
        className={cn(
          'fixed inset-0 z-[55] bg-scrim transition-opacity duration-200 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
      />

      <div
        className={cn(
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[60] max-lg:shadow-v2-pop max-lg:transition-transform max-lg:duration-200 motion-reduce:transition-none',
          mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:invisible max-lg:-translate-x-[102%]',
        )}
        role={drawer && mobileOpen ? 'dialog' : undefined}
        aria-modal={drawer && mobileOpen ? true : undefined}
        aria-label={drawer ? t('nav.label') : undefined}
      >
        <Sidebar
          groups={groups}
          user={{ displayName: liveName, roleName, avatarUrl, avatarColor }}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          drawer={drawer}
          onCloseDrawer={closeDrawer}
          isPrivileged={isPrivileged}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          displayName={liveName}
          roleName={roleName}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor}
          menuOpen={mobileOpen}
          onMenuClick={() => setMobileOpen((o) => !o)}
        />
        <main id="content" tabIndex={-1} className="v2-content min-w-0 flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
