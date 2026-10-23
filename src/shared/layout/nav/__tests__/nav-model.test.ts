import { describe, it, expect } from 'vitest';
import { buildNav, navHrefs, topLevelKeys, activeNav, buildCrumbs, type NavInput, type MenuPerms } from '../nav-model';
import { v1VisibleHrefs, v1TopLevel, V1_ALWAYS_VISIBLE_MENUS, type V1Input } from './v1-menu-oracle';

const MENUS = ['logs', 'analytics', 'helpdesk', 'hr', 'settings'];
const SETTING_FEATS = ['priorities', 'task_types', 'completion_templates', 'profile', 'notifications'];
const ROLES = ['ADMIN', 'BOSS', 'EMPLOYEE', 'KHAC'];

function subsets<T>(arr: T[]): T[][] {
  return Array.from({ length: 1 << arr.length }, (_, m) => arr.filter((_, i) => m & (1 << i)));
}

/** Quy đổi input mới → state V1 tương ứng (hook useMyPermissions: đang tải / lỗi / có dữ liệu). */
function toV1(input: NavInput): V1Input {
  const privileged = input.role === 'ADMIN' || input.role === 'BOSS';
  return {
    userRole: input.role,
    visibleMenus: input.perms?.visibleMenus ?? V1_ALWAYS_VISIBLE_MENUS,
    featurePerms: input.perms?.featurePermissions ?? {},
    // V1: ADMIN/BOSS bỏ qua fetch, menuLoaded = true
    menuLoaded: privileged ? true : input.loaded,
  };
}

function allInputs(): NavInput[] {
  const out: NavInput[] = [];
  const permsList: (MenuPerms | undefined)[] = [undefined];
  for (const vm of subsets(MENUS)) {
    for (const fs of [...subsets(SETTING_FEATS), null]) {
      permsList.push({ visibleMenus: vm, featurePermissions: fs === null ? { logs: ['task_activity'] } : { settings: fs } });
    }
  }
  for (const role of ROLES) {
    out.push({ role, loaded: false }); // đang tải
    out.push({ role, loaded: true }); // lỗi fetch → giữ mặc định
    for (const perms of permsList.slice(1)) out.push({ role, perms, loaded: true });
  }
  return out;
}

describe('buildNav — đối chiếu y hệt logic lọc menu V1', () => {
  const inputs = allInputs();

  it(`tập href nhìn thấy giống V1 cho mọi tổ hợp vai trò × menu × quyền Cài đặt (${inputs.length} trường hợp)`, () => {
    const diffs: string[] = [];
    for (const input of inputs) {
      const got = [...navHrefs(buildNav(input))].sort();
      const want = [...v1VisibleHrefs(toV1(input))].sort();
      if (JSON.stringify(got) !== JSON.stringify(want)) diffs.push(`${JSON.stringify(input)}\n  got  ${got.join(' ')}\n  want ${want.join(' ')}`);
    }
    expect(diffs.slice(0, 5).join('\n')).toBe('');
  });

  it('các mục cấp 1 giống V1', () => {
    for (const input of inputs) {
      expect([...topLevelKeys(buildNav(input))].sort(), JSON.stringify(input)).toEqual([...v1TopLevel(toV1(input))].sort());
    }
  });

  it('ví dụ: nhân viên chưa được cấp gì chỉ thấy Tổng quan + Công việc', () => {
    const hrefs = navHrefs(buildNav({ role: 'EMPLOYEE', perms: { visibleMenus: [], featurePermissions: {} }, loaded: true }));
    expect(hrefs.sort()).toEqual(['/', '/tasks']);
  });

  it('ví dụ: Boss thấy ★ Quan trọng / Mới xong kèm số đếm, nhân viên thì không', () => {
    const boss = buildNav({ role: 'BOSS', loaded: true });
    const links = boss.flatMap((g) => g.entries).filter((e) => e.kind === 'link');
    expect(links.filter((l) => l.kind === 'link' && l.counter).map((l) => l.kind === 'link' && l.counter)).toEqual(['important', 'unseen']);
    const emp = buildNav({ role: 'EMPLOYEE', perms: { visibleMenus: MENUS, featurePermissions: {} }, loaded: true });
    expect(navHrefs(emp)).not.toContain('/tasks?view=important');
  });

  it('nhóm: Công việc trước, Quản trị sau; nhân viên → nhãn "Được cấp riêng"; nhóm rỗng bị bỏ', () => {
    const boss = buildNav({ role: 'BOSS', loaded: true });
    expect(boss.map((g) => [g.key, g.label])).toEqual([['work', 'nav.group.work'], ['admin', 'nav.group.admin']]);
    expect(boss[0].entries.map((e) => e.key)).toEqual(['dashboard', 'tasks', 'tasks-important', 'tasks-unseen', 'helpdesk', 'analytics']);
    expect(boss[1].entries.map((e) => e.key)).toEqual(['hr', 'logs', 'settings']);
    const emp = buildNav({ role: 'EMPLOYEE', perms: { visibleMenus: ['logs'], featurePermissions: {} }, loaded: true });
    expect(emp.map((g) => [g.key, g.label])).toEqual([['work', 'nav.group.work'], ['admin', 'nav.group.granted']]);
    const none = buildNav({ role: 'EMPLOYEE', perms: { visibleMenus: [], featurePermissions: {} }, loaded: true });
    expect(none.map((g) => g.key)).toEqual(['work']);
  });
});

describe('activeNav — tô mục đang chọn theo route', () => {
  const nav = buildNav({ role: 'ADMIN', loaded: true });
  const cases: [string, string | null, { link?: string; section?: string }][] = [
    ['/', null, { link: 'dashboard' }],
    ['/tasks', null, { link: 'tasks' }],
    ['/tasks/ckabc123', null, { link: 'tasks' }],
    ['/tasks', 'important', { link: 'tasks-important' }],
    ['/tasks', 'unseen', { link: 'tasks-unseen' }],
    ['/tasks', 'khac', { link: 'tasks' }],
    ['/helpdesk', null, { link: 'helpdesk' }],
    ['/analytics', null, { section: 'analytics', link: 'analytics-overview' }],
    ['/analytics/task-list', null, { section: 'analytics', link: 'analytics-task-list' }],
    ['/analytics/research', null, { section: 'analytics' }],
    ['/hr/users', null, { section: 'hr', link: 'hr-users' }],
    ['/hr/users/ck1/permissions', null, { section: 'hr', link: 'hr-users' }],
    ['/hr/permissions/logs', null, { section: 'hr', link: 'hr-perm-logs' }],
    ['/logs/task-activity', null, { link: 'logs' }],
    ['/settings/priorities', null, { section: 'settings', link: 'settings-priorities' }],
    ['/settings/smtp', null, { section: 'settings', link: 'settings-smtp' }],
    ['/settings', null, { section: 'settings' }],
    ['/khong-ton-tai', null, {}],
    ['/tasksabc', null, {}],
  ];
  it.each(cases)('%s ?view=%s', (path, view, want) => {
    expect(activeNav(nav, path, view)).toEqual(want);
  });
});

describe('buildCrumbs — breadcrumb từ pathname', () => {
  it.each<[string, string | null, unknown]>([
    ['/', null, [{ label: 'nav.home' }]],
    ['/tasks', null, [{ label: 'nav.tasks' }]],
    ['/tasks', 'important', [{ label: 'nav.tasks', href: '/tasks' }, { label: 'nav.starred' }]],
    ['/tasks', 'unseen', [{ label: 'nav.tasks', href: '/tasks' }, { label: 'nav.unseen' }]],
    ['/tasks/ck123', null, [{ label: 'nav.tasks', href: '/tasks' }, { taskId: 'ck123', mono: true }]],
    ['/tasks', 'drafts', [{ label: 'nav.tasks', href: '/tasks' }, { label: 'dr.tab' }]],
    ['/tasks/new', null, [{ label: 'nav.tasks', href: '/tasks' }, { label: 'tf.title.new' }]],
    ['/helpdesk', null, [{ label: 'nav.helpdesk' }]],
    ['/analytics', null, [{ label: 'nav.reports' }]],
    ['/analytics/task-list', null, [{ label: 'nav.reports', href: '/analytics' }, { label: 'nav.sub.taskList' }]],
    ['/analytics/research', null, [{ label: 'nav.reports', href: '/analytics' }, { label: 'nav.sub.research' }]],
    ['/hr/users', null, [{ label: 'nav.people' }, { label: 'nav.sub.staff' }]],
    ['/hr/users/ck9/permissions', null, [{ label: 'nav.people' }, { label: 'nav.sub.staff', href: '/hr/users' }, { label: 'nav.sub.taskPerms' }]],
    ['/hr/permissions', null, [{ label: 'nav.people' }, { label: 'nav.sub.perms' }]],
    ['/hr/permissions/settings', null, [{ label: 'nav.people' }, { label: 'nav.sub.perms', href: '/hr/permissions' }, { label: 'nav.settings' }]],
    ['/logs/user-activity', null, [{ label: 'nav.logs', href: '/logs' }, { label: 'nav.sub.logUser' }]],
    ['/settings/priorities', null, [{ label: 'nav.settings' }, { label: 'nav.sub.priorities' }]],
    ['/settings/general', null, [{ label: 'nav.settings' }, { label: 'nav.sub.general' }]],
    ['/settings/profile', null, [{ label: 'nav.settings' }, { label: 'top.profile' }]],
    ['/khong-ton-tai', null, [{ label: 'er.crumb' }]],
    ['/tasks/ck1/la', null, [{ label: 'nav.tasks', href: '/tasks' }]],
  ])('%s ?view=%s', (path, view, want) => {
    expect(buildCrumbs(path, view)).toEqual(want);
  });
});
