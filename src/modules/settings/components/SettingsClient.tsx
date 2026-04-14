'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Flag, User, Bell, ListChecks, Settings, Mail, Shield, BarChart3 } from 'lucide-react';
import { PrioritiesSection } from './PrioritiesSection';
import { TaskTypesSection } from './TaskTypesSection';
import { AvatarSection } from './AvatarSection';
import { NotificationSection } from './NotificationSection';
import { SmtpSection } from './SmtpSection';
import { SecuritySection } from './SecuritySection';
import { DigestSection } from './DigestSection';
import { useUserPermissions, hasFeaturePermission } from '@/modules/hr/permissions';

type SettingsTab = 'priorities' | 'task-types' | 'avatar' | 'notifications' | 'digest' | 'smtp' | 'security';

interface NavItem {
  key: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
  bossOrAdmin?: boolean;
  permissionKey?: string;
  group?: string;
}
const NAV_ITEMS: NavItem[] = [
  // Hệ thống
  { key: 'priorities',   label: 'Mức ưu tiên',    icon: Flag,      description: 'Cấp độ ưu tiên cho task',          group: 'system', permissionKey: 'priorities' },
  { key: 'task-types',  label: 'Loại công việc', icon: ListChecks, description: 'Phân loại công việc',             group: 'system', permissionKey: 'task_types' },
  // Tài khoản
  { key: 'avatar',      label: 'Profile',       icon: User,      description: 'Ảnh đại diện & tên hiển thị',      group: 'account', permissionKey: 'profile' },
  { key: 'notifications', label: 'Thông báo',    icon: Bell,      description: 'Cài đặt email nhận được',       group: 'account', permissionKey: 'notifications' },
  { key: 'digest',       label: 'Báo cáo định kỳ', icon: BarChart3, description: 'Tổng hợp task gửi định kỳ', group: 'account', bossOrAdmin: true },
  // Bảo mật
  { key: 'security',    label: 'Bảo mật',       icon: Shield,    description: 'Rate limit, password policy, session', group: 'security', adminOnly: true },
  // Admin
  { key: 'smtp',        label: 'SMTP Email',    icon: Mail,      description: 'Cấu hình máy chủ gửi email', group: 'admin', adminOnly: true },
];

const GROUP_LABELS: Record<string, string> = {
  system: 'Hệ thống',
  account: 'Tài khoản',
  security: 'Bảo mật',
  admin: 'Quản trị',
};

export function SettingsClient() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.name ?? 'EMPLOYEE';
  const isAdmin = userRole === 'ADMIN';
  const isBossOrAdmin = ['ADMIN', 'BOSS'].includes(userRole);
  const { data: permissions } = useUserPermissions();

  const [activeTab, setActiveTab] = useState<SettingsTab>('priorities');

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.bossOrAdmin) return isBossOrAdmin;
    if (item.permissionKey) return hasFeaturePermission('settings', item.permissionKey, permissions);
    return true;
  });
  
  const groups = [...new Set(visibleItems.map((i) => i.group!))];
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 pb-2 border-b">
        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-900/30 dark:to-slate-800/50 border border-indigo-100/60 dark:border-indigo-700/40">
          <Settings className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cài đặt</h1>
          <p className="text-sm text-muted-foreground">Quản lý cấu hình hệ thống và tài khoản</p>
        </div>
      </div>

      {/* 2-col layout */}
      <div className="flex gap-6 min-h-[600px]">

        {/* Left nav */}
        <nav className="w-52 shrink-0 space-y-5">
          {groups.map((group) => {
            const items = visibleItems.filter((i) => i.group === group);
            return (
              <div key={group} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {GROUP_LABELS[group]}
                </p>
                {items.map(({ key, label, icon: Icon, description, permissionKey }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
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
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="w-px bg-border shrink-0" />

        {/* Content panel */}
        <div className="flex-1 min-w-0 pb-6">
          {activeTab === 'priorities'   && <PrioritiesSection />}
          {activeTab === 'task-types'   && <TaskTypesSection />}
          {activeTab === 'avatar'       && <AvatarSection />}
          {activeTab === 'notifications' && <NotificationSection />}
          {activeTab === 'digest' && isBossOrAdmin && <DigestSection />}
          {activeTab === 'smtp' && isAdmin && <SmtpSection />}
          {activeTab === 'security' && isAdmin && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}
