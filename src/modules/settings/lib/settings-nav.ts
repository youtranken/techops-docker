/**
 * Các mục trong khu Cài đặt (nav con, preview `settings.html` SECS) — lọc theo đúng luật V1:
 *  - ADMIN/BOSS: Mức ưu tiên, Loại công việc, Mẫu hoàn thành, Thông báo, Báo cáo định kỳ, Nhắc quá hạn (requireSettingsFeature / role check).
 *  - Chỉ ADMIN: Email (SMTP) + Mẫu email (tab của /settings/smtp, layout chỉ Admin), Bảo mật (API chỉ Admin).
 *  - Nhân viên: chỉ mục có trong featurePermissions.settings; Thông báo với nhân viên là chỉ xem (PATCH 403).
 *  - "Chung" (/settings/general) KHÔNG có trong menu V1 → không đưa vào nav (route vẫn mở như V1).
 */
export type SettingsGroup = 'work' | 'notif' | 'sys';
export interface SettingsSection {
  key: string;
  href: string;
  group: SettingsGroup;
  readOnly: boolean;
  adminOnly: boolean;
}

const ALL: { key: string; href: string; group: SettingsGroup; feat?: string; boss?: boolean; admin?: boolean }[] = [
  { key: 'priorities', href: '/settings/priorities', group: 'work', feat: 'priorities' },
  { key: 'types', href: '/settings/task-types', group: 'work', feat: 'task_types' },
  { key: 'templates', href: '/settings/completion-templates', group: 'work', feat: 'completion_templates' },
  { key: 'notifications', href: '/settings/notifications', group: 'notif', feat: 'notifications' },
  { key: 'digest', href: '/settings/digest', group: 'notif', boss: true },
  { key: 'overdue', href: '/settings/overdue-reminder', group: 'notif', boss: true },
  { key: 'smtp', href: '/settings/smtp', group: 'sys', admin: true },
  { key: 'emails', href: '/settings/smtp?tab=templates', group: 'sys', admin: true },
  { key: 'security', href: '/settings/security', group: 'sys', admin: true },
];

export function settingsSections(role: string, settingsFeatures: string[]): SettingsSection[] {
  const isAdmin = role === 'ADMIN';
  const priv = isAdmin || role === 'BOSS';
  return ALL.filter((s) => {
    if (s.admin) return isAdmin;
    if (s.boss) return priv;
    return priv || (!!s.feat && settingsFeatures.includes(s.feat));
  }).map((s) => ({ key: s.key, href: s.href, group: s.group, readOnly: !priv && s.key === 'notifications', adminOnly: !!s.admin }));
}

/** Mục đang mở theo đường dẫn (+ ?tab=templates của trang SMTP) */
export function activeSection(pathname: string, tab: string | null): string | null {
  if (pathname.startsWith('/settings/smtp')) return tab === 'templates' ? 'emails' : 'smtp';
  const hit = ALL.find((s) => !s.href.includes('?') && (pathname === s.href || pathname.startsWith(s.href + '/')));
  if (hit) return hit.key;
  if (pathname.startsWith('/settings/general')) return 'general';
  return null;
}
