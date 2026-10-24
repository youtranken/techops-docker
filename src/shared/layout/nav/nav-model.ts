/**
 * Mô hình điều hướng của khung app V2 — hàm thuần, test được (src/shared/layout/nav/__tests__).
 *
 * buildNav() GIỮ NGUYÊN luật lọc menu V1 (Sidebar.tsx + AnalyticsMenu/HRMenu/SettingsMenu cũ):
 *  - ADMIN/BOSS thấy hết; nhân viên theo `visibleMenus` + `featurePermissions` cấp riêng (api/hr/sidebar-permissions).
 *  - Khi chưa tải xong quyền: visibleMenus = ALWAYS_VISIBLE_MENUS (Nhật ký/Helpdesk hiện), Báo cáo/Nhân sự/Cài đặt chờ tải.
 *  - Tải lỗi: giữ mặc định ALWAYS_VISIBLE_MENUS, featurePermissions = {}.
 * Có test đối chiếu từng tổ hợp với bản sao logic V1 (__tests__/v1-menu-oracle.ts).
 * Chỉ đổi cách bày: nhóm "Công việc" / "Quản trị" theo preview ds-v2 (app.js NAV).
 */
import { ALWAYS_VISIBLE_MENUS } from '../sidebar/config';

export type NavIcon =
  | 'home' | 'tasks' | 'star' | 'unseen' | 'helpdesk' | 'reports' | 'people' | 'logs' | 'settings'
  | 'chart' | 'list' | 'user' | 'shield' | 'flag' | 'listChecks' | 'file' | 'bell' | 'digest' | 'alarm' | 'mail';

export interface NavLink {
  kind: 'link';
  key: string;
  href: string;
  /** khoá i18n */
  label: string;
  icon?: NavIcon;
  /** số đếm V1 (useTaskCounters): ★ quan trọng / hoàn thành chưa xem */
  counter?: 'important' | 'unseen';
  /** mục con thụt lề dưới "Công việc" */
  sub?: boolean;
  /** chỉ khớp đúng pathname (không khớp route con) */
  exact?: boolean;
  /** khớp /tasks?view=… */
  view?: string;
}
export interface NavHeading { kind: 'heading'; key: string; label: string }
export interface NavSection {
  kind: 'section';
  key: string;
  label: string;
  icon: NavIcon;
  /** đích khi sidebar thu gọn (V1: /analytics, /hr/users, /settings) */
  href: string;
  /** route thuộc nhóm */
  prefix: string;
  children: (NavLink | NavHeading)[];
}
export type NavEntry = NavLink | NavSection;
export interface NavGroup { key: 'work' | 'admin'; label: string; entries: NavEntry[] }
export interface MenuPerms { visibleMenus: string[]; featurePermissions: Record<string, string[]> }
export interface NavInput {
  role: string;
  /** dữ liệu quyền đã tải (nhân viên); undefined = đang tải hoặc lỗi */
  perms?: MenuPerms;
  /** đã tải xong (thành công hoặc lỗi) */
  loaded: boolean;
}
export interface Crumb { label?: string; text?: string; href?: string; mono?: boolean; taskId?: string }

export const TASK_VIEWS = ['important', 'unseen'] as const;

const ALL_SETTING_FEATS = ['priorities', 'task_types', 'completion_templates', 'profile', 'notifications'];
const SETTINGS_SYSTEM: { key: string; href: string; label: string; icon: NavIcon; feat: string }[] = [
  { key: 'settings-priorities', href: '/settings/priorities', label: 'nav.sub.priorities', icon: 'flag', feat: 'priorities' },
  { key: 'settings-task-types', href: '/settings/task-types', label: 'nav.sub.taskTypes', icon: 'listChecks', feat: 'task_types' },
  { key: 'settings-templates', href: '/settings/completion-templates', label: 'nav.sub.templates', icon: 'file', feat: 'completion_templates' },
  { key: 'settings-profile', href: '/settings/profile', label: 'top.profile', icon: 'user', feat: 'profile' },
];
const HR_PERMS: { key: string; href: string; label: string }[] = [
  { key: 'hr-perm-logs', href: '/hr/permissions/logs', label: 'nav.logs' },
  { key: 'hr-perm-users', href: '/hr/permissions/users', label: 'nav.sub.staff' },
  { key: 'hr-perm-analytics', href: '/hr/permissions/analytics', label: 'nav.reports' },
  { key: 'hr-perm-helpdesk', href: '/hr/permissions/helpdesk', label: 'nav.helpdesk' },
  { key: 'hr-perm-settings', href: '/hr/permissions/settings', label: 'nav.settings' },
];

const link = (key: string, href: string, label: string, icon?: NavIcon, extra: Partial<NavLink> = {}): NavLink => ({
  kind: 'link', key, href, label, ...(icon ? { icon } : {}), ...extra,
});
const heading = (key: string, label: string): NavHeading => ({ kind: 'heading', key, label });

function settingsChildren(role: string, featurePerms: Record<string, string[]>): (NavLink | NavHeading)[] | null {
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';
  const isAdmin = role === 'ADMIN';
  const feats = isPrivileged ? ALL_SETTING_FEATS : (featurePerms.settings ?? []);
  const system = SETTINGS_SYSTEM.filter((i) => feats.includes(i.feat));
  const showNotif = feats.includes('notifications');
  // V1 SettingsMenu: không có mục nào → không hiện cả nhóm
  if (system.length === 0 && !isAdmin && !showNotif && !isPrivileged) return null;
  const out: (NavLink | NavHeading)[] = [];
  if (system.length) {
    out.push(heading('settings-h-system', 'nav.sub.g.system'));
    out.push(...system.map((i) => link(i.key, i.href, i.label, i.icon)));
  }
  if (showNotif) {
    out.push(heading('settings-h-account', 'nav.sub.g.account'));
    out.push(link('settings-notifications', '/settings/notifications', 'nav.sub.notifications', 'bell'));
  }
  if (isPrivileged) {
    out.push(link('settings-digest', '/settings/digest', 'nav.sub.digest', 'digest'));
    out.push(link('settings-overdue', '/settings/overdue-reminder', 'nav.sub.overdue', 'alarm'));
  }
  if (isAdmin) {
    out.push(heading('settings-h-security', 'nav.sub.g.security'));
    out.push(link('settings-security', '/settings/security', 'nav.sub.security', 'shield'));
    out.push(heading('settings-h-admin', 'nav.sub.g.admin'));
    out.push(link('settings-smtp', '/settings/smtp', 'nav.sub.smtp', 'mail'));
  }
  return out;
}

export function buildNav({ role, perms, loaded }: NavInput): NavGroup[] {
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';
  // V1: ADMIN/BOSS không cần tải quyền
  const menuLoaded = isPrivileged || loaded;
  const visibleMenus = perms?.visibleMenus ?? ALWAYS_VISIBLE_MENUS;
  const featurePerms = perms?.featurePermissions ?? {};
  const canSee = (k: string) => isPrivileged || visibleMenus.includes(k);
  // V1 SIMPLE_MENU_ITEMS: logs/helpdesk chỉ cho 3 vai trò đã biết
  const knownRole = ['ADMIN', 'BOSS', 'EMPLOYEE'].includes(role);

  const work: NavEntry[] = [
    link('dashboard', '/', 'nav.home', 'home', { exact: true }),
    link('tasks', '/tasks', 'nav.tasks', 'tasks'),
  ];
  if (isPrivileged) {
    work.push(link('tasks-important', '/tasks?view=important', 'nav.starred', 'star', { sub: true, counter: 'important', view: 'important' }));
    work.push(link('tasks-unseen', '/tasks?view=unseen', 'nav.unseen', 'unseen', { sub: true, counter: 'unseen', view: 'unseen' }));
  }
  if (knownRole && canSee('helpdesk')) work.push(link('helpdesk', '/helpdesk', 'nav.helpdesk', 'helpdesk'));
  if (canSee('analytics') && menuLoaded) {
    work.push({
      kind: 'section', key: 'analytics', label: 'nav.reports', icon: 'reports', href: '/analytics', prefix: '/analytics',
      children: [
        link('analytics-overview', '/analytics', 'nav.sub.overview', 'chart', { exact: true }),
        ...(isPrivileged ? [link('analytics-task-list', '/analytics/task-list', 'nav.sub.taskList', 'list')] : []),
      ],
    });
  }

  const admin: NavEntry[] = [];
  if (canSee('hr') && menuLoaded) {
    admin.push({
      kind: 'section', key: 'hr', label: 'nav.people', icon: 'people', href: '/hr/users', prefix: '/hr',
      children: [
        link('hr-users', '/hr/users', 'nav.sub.staff', 'people'),
        ...(isPrivileged ? [heading('hr-h-perms', 'nav.sub.perms'), ...HR_PERMS.map((p) => link(p.key, p.href, p.label))] : []),
      ],
    });
  }
  if (knownRole && canSee('logs')) admin.push(link('logs', '/logs', 'nav.logs', 'logs'));
  const showSettings = isPrivileged || (menuLoaded && canSee('settings'));
  const sChildren = showSettings ? settingsChildren(role, featurePerms) : null;
  // V2 (user chốt 24/10): sidebar chỉ 1 mục Cài đặt; các trang con nằm ở thanh điều hướng trong khu Cài đặt.
  // Vẫn dùng settingsChildren để giữ đúng điều kiện hiện nhóm của V1.
  if (sChildren) admin.push(link('settings', '/settings', 'nav.settings', 'settings'));

  const groups: NavGroup[] = [{ key: 'work', label: 'nav.group.work', entries: work }];
  if (admin.length) groups.push({ key: 'admin', label: isPrivileged ? 'nav.group.admin' : 'nav.group.granted', entries: admin });
  return groups;
}

/** Mọi href nhìn thấy (sidebar mở rộng, mở hết nhóm). */
export function navHrefs(groups: NavGroup[]): string[] {
  const out: string[] = [];
  for (const g of groups) {
    for (const e of g.entries) {
      if (e.kind === 'link') out.push(e.href);
      else for (const c of e.children) if (c.kind === 'link') out.push(c.href);
    }
  }
  return out;
}

/** Khoá mục cấp 1 theo tên V1 (dashboard, tasks, logs, helpdesk, analytics, hr, settings). */
export function topLevelKeys(groups: NavGroup[]): string[] {
  return groups.flatMap((g) => g.entries).filter((e) => !(e.kind === 'link' && e.sub)).map((e) => e.key);
}

function matchesPath(href: string, pathname: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

/** Mục đang chọn theo route. Route con (vd /tasks/[id]) tô mục cha gần nhất; ?view=important/unseen tô mục con tương ứng. */
export function activeNav(groups: NavGroup[], pathname: string, view?: string | null): { link?: string; section?: string } {
  const entries = groups.flatMap((g) => g.entries);
  if (pathname === '/tasks' && view) {
    const v = entries.find((e) => e.kind === 'link' && e.view === view);
    if (v) return { link: v.key };
  }
  for (const e of entries) {
    if (e.kind === 'link') {
      if (!e.view && matchesPath(e.href, pathname, e.exact)) return { link: e.key };
      continue;
    }
    if (!matchesPath(e.prefix, pathname)) continue;
    let best: NavLink | undefined;
    for (const c of e.children) {
      if (c.kind !== 'link' || !matchesPath(c.href, pathname, c.exact)) continue;
      if (!best || c.href.length > best.href.length) best = c;
    }
    return best ? { section: e.key, link: best.key } : { section: e.key };
  }
  return {};
}

const SETTINGS_CRUMB: Record<string, string> = {
  priorities: 'nav.sub.priorities',
  'task-types': 'nav.sub.taskTypes',
  'completion-templates': 'nav.sub.templates',
  profile: 'top.profile',
  notifications: 'nav.sub.notifications',
  digest: 'nav.sub.digest',
  'overdue-reminder': 'nav.sub.overdue',
  security: 'nav.sub.security',
  smtp: 'nav.sub.smtp',
  general: 'nav.sub.general',
};
const LOGS_CRUMB: Record<string, string> = {
  'task-activity': 'nav.sub.logTask',
  'user-activity': 'nav.sub.logUser',
  'task-reference': 'nav.sub.logRef',
};
const PERM_CRUMB: Record<string, string> = Object.fromEntries(HR_PERMS.map((p) => [p.href.split('/').pop()!, p.label]));

/** Breadcrumb theo route. Mục cuối không có href. Route lạ → "Lỗi" (trang 404). */
export function buildCrumbs(pathname: string, view?: string | null): Crumb[] {
  const seg = pathname.split('/').filter(Boolean);
  const [a, b, c, d] = seg;
  if (seg.length === 0) return [{ label: 'nav.home' }];
  switch (a) {
    case 'tasks':
      if (!b) {
        if (view === 'important') return [{ label: 'nav.tasks', href: '/tasks' }, { label: 'nav.starred' }];
        if (view === 'unseen') return [{ label: 'nav.tasks', href: '/tasks' }, { label: 'nav.unseen' }];
        if (view === 'drafts') return [{ label: 'nav.tasks', href: '/tasks' }, { label: 'dr.tab' }];
        return [{ label: 'nav.tasks' }];
      }
      if (b === 'new' && seg.length === 2) return [{ label: 'nav.tasks', href: '/tasks' }, { label: 'tf.title.new' }];
      if (seg.length === 2) return [{ label: 'nav.tasks', href: '/tasks' }, { taskId: b, mono: true }];
      return [{ label: 'nav.tasks', href: '/tasks' }];
    case 'helpdesk':
      return [{ label: 'nav.helpdesk' }];
    case 'notifications':
      return [{ label: 'nt.title' }];
    case 'analytics':
      if (b === 'task-list') return [{ label: 'nav.reports', href: '/analytics' }, { label: 'nav.sub.taskList' }];
      if (b === 'research') return [{ label: 'nav.reports', href: '/analytics' }, { label: 'nav.sub.research' }];
      return [{ label: 'nav.reports' }];
    case 'hr':
      if (b === 'users' && c && d === 'permissions') return [{ label: 'nav.people' }, { label: 'nav.sub.staff', href: '/hr/users' }, { label: 'nav.sub.taskPerms' }];
      if (b === 'users') return [{ label: 'nav.people' }, { label: 'nav.sub.staff' }];
      if (b === 'permissions' && c && PERM_CRUMB[c]) return [{ label: 'nav.people' }, { label: 'nav.sub.perms', href: '/hr/permissions' }, { label: PERM_CRUMB[c] }];
      if (b === 'permissions') return [{ label: 'nav.people' }, { label: 'nav.sub.perms' }];
      return [{ label: 'nav.people' }];
    case 'logs':
      if (b && LOGS_CRUMB[b]) return [{ label: 'nav.logs', href: '/logs' }, { label: LOGS_CRUMB[b] }];
      return [{ label: 'nav.logs' }];
    case 'settings':
      if (b && SETTINGS_CRUMB[b]) return [{ label: 'nav.settings' }, { label: SETTINGS_CRUMB[b] }];
      return [{ label: 'nav.settings' }];
    case 'dev':
      return [{ text: 'Dev · UI' }];
    default:
      return [{ label: 'er.crumb' }];
  }
}
