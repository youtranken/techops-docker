'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag, User, Bell, ListChecks, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPermissions, hasFeaturePermission } from '@/modules/hr/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
  permissionKey?: string; // Key to check in featurePermissions.settings[]
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  // Hệ thống
  { href: '/settings/priorities',   label: 'Mức ưu tiên',    icon: Flag,       description: 'Cấp độ ưu tiên cho task',         group: 'system', permissionKey: 'priorities' },
  { href: '/settings/task-types',   label: 'Loại công việc', icon: ListChecks, description: 'Phân loại công việc',              group: 'system', permissionKey: 'task_types' },
  // Tài khoản
  { href: '/settings/profile',      label: 'Profile',        icon: User,       description: 'Ảnh đại diện & tên hiển thị',      group: 'account', permissionKey: 'profile' },
  { href: '/settings/notifications',label: 'Thông báo',      icon: Bell,       description: 'Cài đặt email nhận được',          group: 'account', permissionKey: 'notifications' },
  // Quản trị
  { href: '/settings/smtp',         label: 'SMTP Email',     icon: Mail,       description: 'Cấu hình máy chủ gửi email',      group: 'admin', adminOnly: true },
];

const GROUP_LABELS: Record<string, string> = {
  system: 'Hệ thống',
  account: 'Tài khoản',
  admin: 'Quản trị',
};

interface Props { roleName: string }

export function SettingsNav({ roleName }: Props) {
  const pathname = usePathname();
  const isAdmin = roleName === 'ADMIN';
  const { data: permissions } = useUserPermissions();

  const visibleItems = NAV_ITEMS.filter((item) => {
    // SMTP chỉ dành cho Admin, không qua permission system
    if (item.adminOnly) return isAdmin;
    
    // Items có permissionKey → check feature permission
    if (item.permissionKey) {
      return hasFeaturePermission('settings', item.permissionKey, permissions);
    }
    
    // Fallback: hiển thị nếu không có permissionKey
    return true;
  });
  
  const groups = [...new Set(visibleItems.map((i) => i.group))];

  return (
    <nav className="w-52 shrink-0 space-y-5">
      {groups.map((group) => {
        const items = visibleItems.filter((i) => i.group === group);
        return (
          <div key={group} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {GROUP_LABELS[group]}
            </p>
            {items.map(({ href, label, icon: Icon, description, permissionKey }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{label}</p>
                    <p className={cn('text-[11px] mt-0.5 truncate leading-tight',
                      active ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      {description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
