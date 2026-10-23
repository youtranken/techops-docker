/**
 * BẢN SAO ĐÓNG BĂNG logic lọc menu của V1 — chỉ dùng làm "đáp án" cho test đối chiếu.
 * Chép nguyên từ (commit 26976a6, nhánh v2/phase-a):
 *   - src/shared/layout/Sidebar.tsx            (canSeeMenu, visibleSimple, showHR/showAnalytics/showSettings, TaskTrackingMenu chỉ Boss/Admin)
 *   - src/shared/layout/sidebar/AnalyticsMenu.tsx (task-list chỉ privileged)
 *   - src/shared/layout/sidebar/HRMenu.tsx        (Phân quyền chỉ privileged)
 *   - src/shared/layout/sidebar/SettingsMenu.tsx  (settingFeats, nhóm Hệ thống/Tài khoản/digest+overdue/Bảo mật/Quản trị, return null)
 *   - src/shared/layout/sidebar/config.ts
 * KHÔNG sửa file này khi đổi giao diện. Trả về tập href nhìn thấy khi sidebar MỞ RỘNG và đã mở hết nhóm con.
 */

export interface V1Input {
  userRole: string;
  /** state `visibleMenus` của V1: mặc định ALWAYS_VISIBLE_MENUS, sau fetch = data.visibleMenus */
  visibleMenus: string[];
  /** state `featurePerms` của V1: mặc định {}, sau fetch = data.featurePermissions */
  featurePerms: Record<string, string[]>;
  menuLoaded: boolean;
}

export const V1_ALWAYS_VISIBLE_MENUS = ['logs', 'analytics', 'helpdesk', 'hr'];

const SIMPLE_MENU_ITEMS = [
  { href: '/', roles: ['ALL'], key: 'dashboard' },
  { href: '/tasks', roles: ['ALL'], key: 'tasks' },
  { href: '/logs', roles: ['ADMIN', 'BOSS', 'EMPLOYEE'], key: 'logs' },
  { href: '/helpdesk', roles: ['ADMIN', 'BOSS', 'EMPLOYEE'], key: 'helpdesk' },
];
const HR_PERMISSIONS_ITEMS = ['/hr/permissions/logs', '/hr/permissions/users', '/hr/permissions/analytics', '/hr/permissions/helpdesk', '/hr/permissions/settings'];
const SETTINGS_SYSTEM_ITEMS = [
  { href: '/settings/priorities', feat: 'priorities' },
  { href: '/settings/task-types', feat: 'task_types' },
  { href: '/settings/completion-templates', feat: 'completion_templates' },
  { href: '/settings/profile', feat: 'profile' },
];

/** Các mục cấp 1 V1 hiện (dashboard, tasks, logs, helpdesk, analytics, hr, settings) */
export function v1TopLevel({ userRole, visibleMenus, featurePerms, menuLoaded }: V1Input): string[] {
  const isPrivileged = userRole === 'ADMIN' || userRole === 'BOSS';
  const isAdmin = userRole === 'ADMIN';
  const canSeeMenu = (key: string) => isPrivileged || visibleMenus.includes(key);
  const visibleSimple = SIMPLE_MENU_ITEMS.filter((item) => {
    if (item.roles.includes('ALL')) return true;
    if (!item.roles.includes(userRole)) return false;
    if (['logs', 'analytics', 'helpdesk'].includes(item.key)) return canSeeMenu(item.key);
    return true;
  });
  const showHR = (isPrivileged || canSeeMenu('hr')) && menuLoaded;
  const showAnalytics = (isPrivileged || canSeeMenu('analytics')) && menuLoaded;
  const showSettings = isPrivileged || (!isPrivileged && menuLoaded && canSeeMenu('settings'));
  const out = visibleSimple.map((i) => i.key);
  if (showAnalytics) out.push('analytics');
  if (showHR) out.push('hr');
  if (showSettings && settingsRendered(isAdmin, isPrivileged, featurePerms)) out.push('settings');
  return out;
}

function settingFeatsOf(isPrivileged: boolean, featurePerms: Record<string, string[]>) {
  return isPrivileged ? ['priorities', 'task_types', 'completion_templates', 'profile', 'notifications'] : (featurePerms['settings'] ?? []);
}

/** SettingsMenu `return null` khi không có mục nào */
function settingsRendered(isAdmin: boolean, isPrivileged: boolean, featurePerms: Record<string, string[]>) {
  const settingFeats = settingFeatsOf(isPrivileged, featurePerms);
  const systemItems = SETTINGS_SYSTEM_ITEMS.filter((i) => settingFeats.includes(i.feat));
  const showNotifications = settingFeats.includes('notifications');
  return !(systemItems.length === 0 && !isAdmin && !showNotifications && !isPrivileged);
}

/** Mọi href V1 hiện khi sidebar mở rộng + mở hết các nhóm (kể cả mục con ★/chưa xem). */
export function v1VisibleHrefs(input: V1Input): string[] {
  const { userRole, featurePerms } = input;
  const isPrivileged = userRole === 'ADMIN' || userRole === 'BOSS';
  const isAdmin = userRole === 'ADMIN';
  const top = v1TopLevel(input);
  const out: string[] = [];
  for (const k of top) {
    if (k === 'dashboard') out.push('/');
    if (k === 'tasks') {
      out.push('/tasks');
      if (isPrivileged) out.push('/tasks?view=important', '/tasks?view=unseen');
    }
    if (k === 'logs') out.push('/logs');
    if (k === 'helpdesk') out.push('/helpdesk');
    if (k === 'analytics') {
      out.push('/analytics');
      if (isPrivileged) out.push('/analytics/task-list');
    }
    if (k === 'hr') {
      out.push('/hr/users');
      if (isPrivileged) out.push(...HR_PERMISSIONS_ITEMS);
    }
    if (k === 'settings') {
      const settingFeats = settingFeatsOf(isPrivileged, featurePerms);
      out.push(...SETTINGS_SYSTEM_ITEMS.filter((i) => settingFeats.includes(i.feat)).map((i) => i.href));
      if (settingFeats.includes('notifications')) out.push('/settings/notifications');
      if (isPrivileged) out.push('/settings/digest', '/settings/overdue-reminder');
      if (isAdmin) out.push('/settings/security');
      if (isAdmin) out.push('/settings/smtp');
    }
  }
  return out;
}
