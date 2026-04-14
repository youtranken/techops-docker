import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SETTINGS_SYSTEM_ITEMS,
  SETTINGS_ACCOUNT_ITEM,
  SETTINGS_SECURITY_ITEM,
  SETTINGS_ADMIN_ITEMS,
  SETTINGS_DIGEST_ITEM,
  SETTINGS_OVERDUE_ITEM,
} from './config';

interface SettingsMenuProps {
  collapsed: boolean;
  isAdmin: boolean;
  isPrivileged: boolean;
  featurePerms: Record<string, string[]>;
}

/**
 * Settings menu dropdown with grouped items
 */
export function SettingsMenu({ collapsed, isAdmin, isPrivileged, featurePerms }: SettingsMenuProps) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settingsActive = pathname.startsWith('/settings');

  // Auto-open when on settings routes
  useEffect(() => {
    if (settingsActive) setSettingsOpen(true);
  }, [settingsActive]);

  // Filter system items by permissions
  const settingFeats = isPrivileged ? ['priorities', 'task_types', 'profile', 'notifications'] : (featurePerms['settings'] ?? []);
  const systemItems = SETTINGS_SYSTEM_ITEMS.filter((i) => settingFeats.includes(i.feat));
  const showAdmin = isAdmin;
  const showNotifications = settingFeats.includes('notifications');

  // Don't show if no items visible
  if (systemItems.length === 0 && !showAdmin && !showNotifications && !isPrivileged) {
    return null;
  }

  if (collapsed) {
    // Collapsed: icon-only link
    return (
      <Link
        href="/settings"
        title="Settings"
        className={cn(
          'flex items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors',
          settingsActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        )}
      >
        <Settings className="w-5 h-5 shrink-0" />
      </Link>
    );
  }

  // Expanded: full dropdown with groups
  return (
    <>
      <button
        onClick={() => setSettingsOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          settingsActive ? 'bg-blue-600/80 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        )}
      >
        <Settings className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">Settings</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', settingsOpen && 'rotate-180')} />
      </button>

      {settingsOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
          {/* System group */}
          {systemItems.length > 0 && (
            <>
              <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Hệ thống
              </p>
              {systemItems.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </>
          )}

          {/* Account group - only shown if notifications permission granted */}
          {showNotifications && (() => {
            const NotifIcon = SETTINGS_ACCOUNT_ITEM.icon;
            const notifHref = SETTINGS_ACCOUNT_ITEM.href;
            return (
              <>
                <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Tài khoản
                </p>
                <Link
                  href={notifHref}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    pathname === notifHref || pathname.startsWith(notifHref + '/')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <NotifIcon className="w-4 h-4 shrink-0" />
                  {SETTINGS_ACCOUNT_ITEM.label}
                </Link>
              </>
            );
          })()}

          {isPrivileged && (
            <>
              {[SETTINGS_DIGEST_ITEM, SETTINGS_OVERDUE_ITEM].map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href}
                  className={cn('flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </>
          )}

          {/* Security group - ADMIN only */}
          {isAdmin && (
            <>
              <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Bảo mật
              </p>
              {(() => {
                const Icon = SETTINGS_SECURITY_ITEM.icon;
                const href = SETTINGS_SECURITY_ITEM.href;
                return (
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      pathname === href || pathname.startsWith(href + '/')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {SETTINGS_SECURITY_ITEM.label}
                  </Link>
                );
              })()}
            </>
          )}

          {/* Admin group - ADMIN only */}
          {showAdmin && (
            <>
              <p className="px-2 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Quản trị
              </p>
              {SETTINGS_ADMIN_ITEMS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
