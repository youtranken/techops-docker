'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

// Components
import { SidebarLogo } from './sidebar/SidebarLogo';
import { SidebarMenuItem } from './sidebar/SidebarMenuItem';
import { HRMenu } from './sidebar/HRMenu';
import { SettingsMenu } from './sidebar/SettingsMenu';
import { AnalyticsMenu } from './sidebar/AnalyticsMenu';
import { CollapseToggle } from './sidebar/CollapseToggle';

// Config
import { ALWAYS_VISIBLE_MENUS, SIMPLE_MENU_ITEMS } from './sidebar/config';

interface SidebarProps {
  userRole: string;
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Main Sidebar Navigation Component
 * 
 * Provides hierarchical navigation with:
 * - Simple menu items (Dashboard, Tasks, etc.)
 * - HR dropdown with permissions submenu
 * - Settings dropdown with grouped items
 * - Permission-based visibility
 */
export function Sidebar({ userRole, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // State
  const [visibleMenus, setVisibleMenus] = useState<string[]>(ALWAYS_VISIBLE_MENUS);
  const [featurePerms, setFeaturePerms] = useState<Record<string, string[]>>({});
  const [menuLoaded, setMenuLoaded] = useState(false);

  // Role checks
  const isPrivileged = userRole === 'ADMIN' || userRole === 'BOSS';
  const isAdmin = userRole === 'ADMIN';
  const userId = session?.user?.id;

  // Fetch sidebar permissions for non-privileged users
  useEffect(() => {
    if (isPrivileged) {
      setMenuLoaded(true);
      return;
    }
    if (!userId) return;

    fetch(`/api/hr/sidebar-permissions?userId=${userId}`)
      .then((r) => r.json())
      .then((json: { data?: { visibleMenus?: string[]; featurePermissions?: Record<string, string[]> } }) => {
        if (json.data?.visibleMenus) setVisibleMenus(json.data.visibleMenus);
        if (json.data?.featurePermissions) setFeaturePerms(json.data.featurePermissions);
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setMenuLoaded(true));
  }, [userId, isPrivileged]);

  // Helper: check if menu is visible
  const canSeeMenu = (key: string) => isPrivileged || visibleMenus.includes(key);

  // Helper: check if path is active
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Filter visible simple menu items
  const visibleSimple = SIMPLE_MENU_ITEMS.filter((item) => {
    if (item.roles.includes('ALL')) return true;
    if (!item.roles.includes(userRole)) return false;
    if (['logs', 'analytics', 'helpdesk'].includes(item.key)) return canSeeMenu(item.key);
    return true;
  });

  // Show flags
  const showHR = (isPrivileged || canSeeMenu('hr')) && menuLoaded;
  const showAnalytics = (isPrivileged || canSeeMenu('analytics')) && menuLoaded;
  const showSettings = isPrivileged || (!isPrivileged && menuLoaded && canSeeMenu('settings'));

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-gray-900 text-white transition-all duration-200 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <SidebarLogo collapsed={collapsed} />

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {/* Simple menu items */}
        {visibleSimple.map((item) => (
          <SidebarMenuItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}

        {/* Analytics dropdown */}
        {showAnalytics && (
          <AnalyticsMenu collapsed={collapsed} isPrivileged={isPrivileged} />
        )}

        {/* HR dropdown */}
        {showHR && (
          <HRMenu
            collapsed={collapsed}
            isAdmin={isAdmin}
            isPrivileged={isPrivileged}
          />
        )}

        {/* Settings dropdown */}
        {showSettings && (
          <SettingsMenu
            collapsed={collapsed}
            isAdmin={isAdmin}
            isPrivileged={isPrivileged}
            featurePerms={featurePerms}
          />
        )}
      </nav>

      {/* Collapse toggle button */}
      <CollapseToggle collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
}
