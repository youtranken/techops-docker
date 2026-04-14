/**
 * Menu configurations for Sidebar
 */

import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  BarChart2,
  Headphones,
  Flag,
  ListChecks,
  User,
  Bell,
  Mail,
  Shield,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

export const ALWAYS_VISIBLE_MENUS = ['logs', 'analytics', 'helpdesk', 'hr'];

/**
 * Simple navigation items (not dropdowns)
 */
export const SIMPLE_MENU_ITEMS = [
  { 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    href: '/', 
    roles: ['ALL'], 
    key: 'dashboard' 
  },
  { 
    label: 'Tasks', 
    icon: CheckSquare, 
    href: '/tasks', 
    roles: ['ALL'], 
    key: 'tasks' 
  },
  { 
    label: 'Logs', 
    icon: FileText, 
    href: '/logs', 
    roles: ['ADMIN', 'BOSS', 'EMPLOYEE'], 
    key: 'logs' 
  },

  { 
    label: 'Helpdesk', 
    icon: Headphones, 
    href: '/helpdesk', 
    roles: ['ADMIN', 'BOSS', 'EMPLOYEE'], 
    key: 'helpdesk' 
  },
];

/**
 * HR submenu items
 */
export const HR_PERMISSIONS_ITEMS = [
  { label: 'Logs', href: '/hr/permissions/logs' },
  { label: 'Nhân viên', href: '/hr/permissions/users' },
  { label: 'Analytics', href: '/hr/permissions/analytics' },
  { label: 'Helpdesk', href: '/hr/permissions/helpdesk' },
  { label: 'Settings', href: '/hr/permissions/settings' },
];

/**
 * Settings menu groups
 */
export const SETTINGS_SYSTEM_ITEMS = [
  { label: 'Mức ưu tiên',    href: '/settings/priorities', icon: Flag,       feat: 'priorities' },
  { label: 'Loại công việc', href: '/settings/task-types',  icon: ListChecks, feat: 'task_types' },
  { label: 'Profile',        href: '/settings/profile',     icon: User,       feat: 'profile' },
];

export const SETTINGS_ACCOUNT_ITEM = {
  label: 'Thông báo',
  href: '/settings/notifications',
  icon: Bell,
};

export const SETTINGS_DIGEST_ITEM = {
  label: 'Báo cáo định kỳ',
  href: '/settings/digest',
  icon: BarChart3,
};

export const SETTINGS_SECURITY_ITEM = {
  label: 'Bảo mật',
  href: '/settings/security',
  icon: Shield,
};

export const SETTINGS_OVERDUE_ITEM = {
  label: 'Nhắc nhở quá hạn',
  href: '/settings/overdue-reminder',
  icon: AlertCircle,
};

export const SETTINGS_ADMIN_ITEMS = [
  { label: 'SMTP Email', href: '/settings/smtp', icon: Mail },
];
