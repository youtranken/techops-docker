import { describe, it, expect } from 'vitest';
import type { TaskStatus } from '@prisma/client';
import {
  readListState, toApiFilters, applyUpdates, filterUpdate, pageUpdate, limitUpdate, sortUpdate,
  tabsFor, activeTab, tabUpdate, filterChips, chipRemoveUpdate, clearFiltersUpdate, filterCount,
  headerSort, quickMenuKeys, latestPendingExtension, displayCode,
} from '../list-logic';
import { v1Filters, v1Update, v1Setters, v1CardMenu } from './v1-list.fixture';
import { useTaskPermissions } from '../../../actions/hooks/useTaskPermissions';
import type { TaskListItem } from '../../../services/task-query.service';

const NOW = new Date('2026-10-23T03:00:00Z');
const ROLES = ['ADMIN', 'BOSS', 'EMPLOYEE'] as const;
const sp = (q: string) => new URLSearchParams(q);
const stateOf = (q: string, role: string) => readListState((k) => sp(q).get(k), role === 'ADMIN' || role === 'BOSS');

// ───────────────────────────── URL → payload API (phải giống V1) ─────────────────────────────
describe('toApiFilters — payload API giống hệt V1', () => {
  const QUERIES = [
    '',
    'search=may%20in',
    'status=IN_PROGRESS',
    'status=all',
    'status=CANCELLED',
    'status=COMPLETED&view=important',
    'status=DRAFT',
    'status=rac',
    'priorityId=p1&typeId=t1&source=helpdesk',
    'source=techops',
    'source=khac',
    'datePreset=today', 'datePreset=7d', 'datePreset=30d', 'datePreset=overdue', 'datePreset=xyz',
    'dateFrom=2026-10-01', 'dateTo=2026-10-31', 'dateFrom=2026-10-01&dateTo=2026-10-31&datePreset=7d',
    'page=3&limit=50', 'page=0&limit=abc', 'page=-2',
    'view=important', 'view=unseen', 'view=unseen&status=COMPLETED', 'view=khac',
    'sort=smart', 'sort=scheduleEnd:asc', 'sort=title:desc', 'sort=status:asc', 'sort=priority:asc', 'sort=createdAt:sideways',
  ];
  for (const role of ROLES) {
    it.each(QUERIES)(`${role} · ?%s`, (q) => {
      expect(toApiFilters(stateOf(q, role), NOW)).toEqual(v1Filters(sp(q), role, NOW));
    });
  }
});

// ───────────────────────────── setter → URL (giống V1) ─────────────────────────────
describe('cập nhật URL — giống các setter V1', () => {
  const BASE = 'search=abc&status=IN_PROGRESS&page=4&datePreset=7d&limit=50';
  it.each([
    ['status', 'active'], ['status', 'all'], ['status', 'COMPLETED'],
    ['priorityId', 'all'], ['priorityId', 'p2'], ['typeId', 'all'], ['typeId', 't9'],
    ['source', 'all'], ['source', 'helpdesk'],
    ['datePreset', 'all'], ['datePreset', '30d'], ['dateFrom', '2026-10-01'], ['dateTo', ''], ['search', ''], ['search', 'x'],
  ] as const)('%s = %s', (k, v) => {
    expect(applyUpdates(BASE, filterUpdate(k, v))).toBe(v1Update(BASE, v1Setters[k](v)));
  });
  it.each([1, 2, 7])('trang %i', (p) => expect(applyUpdates(BASE, pageUpdate(p))).toBe(v1Update(BASE, v1Setters.page(p))));
  it.each([10, 20, 100])('cỡ trang %i', (l) => expect(applyUpdates(BASE, limitUpdate(l))).toBe(v1Update(BASE, v1Setters.limit(l))));
  it.each([
    ['smart', true], ['createdAt:desc', true], ['createdAt:desc', false], ['title:asc', false], ['smart', false],
  ] as const)('sắp xếp %s (tracking=%s)', (v, tr) => {
    expect(applyUpdates(BASE, sortUpdate(v, tr))).toBe(v1Update(BASE, v1Setters.sort(v, tr)));
  });
});

// ───────────────────────────── Tab (thuần client, ánh xạ vào tham số V1) ─────────────────────────────
describe('tab xem nhanh', () => {
  it('Boss/Admin có ★ + Mới xong; nhân viên không (V1 TaskTrackingMenu)', () => {
    expect(tabsFor(true)).toEqual(['open', 'starred', 'unseen', 'done', 'cancelled']);
    expect(tabsFor(false)).toEqual(['open', 'done', 'cancelled']);
  });
  it.each([
    ['', 'open'], ['status=IN_PROGRESS', 'open'], ['status=all', 'open'],
    ['status=COMPLETED', 'done'], ['status=CANCELLED', 'cancelled'],
    ['view=important', 'starred'], ['view=important&status=COMPLETED', 'starred'], ['view=unseen', 'unseen'],
  ])('?%s → %s', (q, tab) => expect(activeTab(stateOf(q, 'BOSS'))).toBe(tab));
  it('nhân viên: ?view=important bị bỏ qua (V1) → Đang mở', () => expect(activeTab(stateOf('view=important', 'EMPLOYEE'))).toBe('open'));

  it.each([
    ['open', {}],
    ['starred', { view: 'important' }],
    ['unseen', { view: 'unseen' }],
    ['done', { status: 'COMPLETED' }],
    ['cancelled', { status: 'CANCELLED' }],
  ] as const)('bấm tab %s → tham số V1', (tab, expected) => {
    const q = applyUpdates('view=important&status=IN_PROGRESS&page=3&priorityId=p1', tabUpdate(tab));
    const got = Object.fromEntries(sp(q));
    expect(got).toEqual({ priorityId: 'p1', ...expected });
  });
});

// ───────────────────────────── Chip bộ lọc ─────────────────────────────
describe('chip bộ lọc đang bật', () => {
  const look = { priorities: [{ id: 'p1', name: 'Khẩn cấp' }], taskTypes: [{ id: 't1', name: 'Phần cứng' }] };
  const chips = (q: string, role = 'BOSS') => filterChips(stateOf(q, role), look);

  it('không lọc → không chip; tab Đã xong/Đã hủy không thành chip', () => {
    expect(chips('')).toEqual([]);
    expect(chips('status=COMPLETED')).toEqual([]);
    expect(chips('status=CANCELLED&search=abc')).toEqual([]);
  });
  it('nhãn từng loại', () => {
    expect(chips('status=IN_PROGRESS&priorityId=p1&typeId=t1&source=helpdesk&datePreset=overdue')).toEqual([
      { key: 'status', label: 'tl.f.status', value: { key: 'st.IN_PROGRESS' } },
      { key: 'priorityId', label: 'tl.f.priority', value: { text: 'Khẩn cấp' } },
      { key: 'typeId', label: 'tl.f.type', value: { text: 'Phần cứng' } },
      { key: 'source', label: 'tl.f.source', value: { key: 'tl.f.src.helpdesk' } },
      { key: 'date', label: 'tl.f.time', value: { key: 'tl.f.t.overdue' } },
    ]);
  });
  it('trạng thái "Tất cả" + trạng thái trong tab ★', () => {
    expect(chips('status=all')).toEqual([{ key: 'status', label: 'tl.f.status', value: { key: 'tlx.f.stAll' } }]);
    expect(chips('view=important&status=COMPLETED')).toEqual([{ key: 'status', label: 'tl.f.status', value: { key: 'st.COMPLETED' } }]);
  });
  it('id ưu tiên/loại không còn trong danh mục → hiện "…" (không vỡ)', () => {
    expect(chips('priorityId=zz')[0]).toEqual({ key: 'priorityId', label: 'tl.f.priority', value: { text: '…' } });
  });
  it('khoảng ngày tự chọn', () => {
    expect(chips('dateFrom=2026-10-01&dateTo=2026-10-31')).toEqual([
      { key: 'date', label: 'tl.f.time', value: { range: { from: '2026-10-01', to: '2026-10-31' } } },
    ]);
    expect(chips('dateTo=2026-10-31')[0].value).toEqual({ range: { from: '', to: '2026-10-31' } });
  });
  it('giá trị rác (V1 bỏ qua khi gọi API) → không chip', () => {
    expect(chips('status=rac&source=khac&datePreset=xyz')).toEqual([]);
  });
  it('đếm số điều kiện', () => {
    expect(filterCount(stateOf('status=IN_PROGRESS&priorityId=p1&dateFrom=2026-10-01&dateTo=2026-10-02', 'BOSS'))).toBe(3);
  });
  it('bỏ 1 chip / xoá lọc: giữ tìm kiếm, tab, cỡ trang; về trang 1', () => {
    const q = 'search=a&view=important&status=IN_PROGRESS&priorityId=p1&typeId=t1&source=techops&datePreset=7d&page=3&limit=50';
    expect(Object.fromEntries(sp(applyUpdates(q, chipRemoveUpdate('date'))))).not.toHaveProperty('datePreset');
    expect(Object.fromEntries(sp(applyUpdates(q, chipRemoveUpdate('status'))))).not.toHaveProperty('status');
    expect(Object.fromEntries(sp(applyUpdates(q, clearFiltersUpdate(stateOf(q, 'BOSS')))))).toEqual({ search: 'a', view: 'important', limit: '50' });
    // tab Đã xong: xoá lọc không làm mất tab
    const d = 'status=COMPLETED&priorityId=p1';
    expect(Object.fromEntries(sp(applyUpdates(d, clearFiltersUpdate(stateOf(d, 'BOSS')))))).toEqual({ status: 'COMPLETED' });
  });
});

// ───────────────────────────── Sắp xếp theo cột ─────────────────────────────
describe('headerSort — bấm tiêu đề cột Hạn / Trạng thái (dùng sortField V1)', () => {
  it('chưa sắp theo cột → tăng dần', () => {
    expect(headerSort(stateOf('', 'BOSS'), 'scheduleEnd')).toEqual({ ariaSort: 'none', next: 'scheduleEnd:asc' });
  });
  it('đang tăng → giảm', () => {
    expect(headerSort(stateOf('sort=scheduleEnd:asc', 'EMPLOYEE'), 'scheduleEnd')).toEqual({ ariaSort: 'ascending', next: 'scheduleEnd:desc' });
  });
  it('đang giảm → về mặc định (smart cho Boss/Admin, createdAt:desc cho nhân viên)', () => {
    expect(headerSort(stateOf('sort=status:desc', 'ADMIN'), 'status')).toEqual({ ariaSort: 'descending', next: 'smart' });
    expect(headerSort(stateOf('sort=status:desc', 'EMPLOYEE'), 'status')).toEqual({ ariaSort: 'descending', next: 'createdAt:desc' });
  });
});

// ───────────────────────────── Menu ⋯ (đối chiếu nút V1) ─────────────────────────────
type Rel = 'creator' | 'assigneePending' | 'assigneeInProgress' | 'assigneeCompleted' | 'other' | 'creatorAndAssignee';
const ME = 'u-me';
function mkTask(status: TaskStatus, mode: string, rel: Rel, extra: Partial<TaskListItem> = {}): TaskListItem {
  const person = (id: string) => ({ id, displayName: id, username: id, profile: null });
  const asg = (id: string, st: string) => ({ id: `a-${id}`, status: st, user: person(id) });
  const assignees = {
    creator: [asg('u-x', 'IN_PROGRESS')],
    other: [asg('u-x', 'IN_PROGRESS')],
    assigneePending: [asg(ME, 'PENDING')],
    assigneeInProgress: [asg(ME, 'IN_PROGRESS')],
    assigneeCompleted: [asg(ME, 'COMPLETED'), asg('u-y', 'IN_PROGRESS')],
    creatorAndAssignee: [asg(ME, 'IN_PROGRESS')],
  }[rel];
  return {
    id: 't1', taskCode: '26-0001', title: 'x', status, workflowMode: mode, isForceMode: false, allFailed: false,
    scheduleStart: NOW, scheduleEnd: NOW, createdAt: NOW,
    priority: { id: 'p', name: 'p', color: '#000', level: 2 }, type: { id: 't', name: 't', color: '#000', icon: 'x' },
    creator: person(rel === 'creator' || rel === 'creatorAndAssignee' ? ME : 'u-boss'),
    assignees, _count: { comments: 0 },
    extensions: [{ id: 'e1', status: 'PENDING', reason: 'r', requestedDate: new Date('2026-11-01'), requester: { id: ME, displayName: 'me' } }],
    hdNguonNhap: null, hdCode: null, isImportant: false, isUnseen: false,
    ...extra,
  };
}
const STATUSES: TaskStatus[] = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'];
const RELS: Rel[] = ['creator', 'assigneePending', 'assigneeInProgress', 'assigneeCompleted', 'other', 'creatorAndAssignee'];
const BUSINESS = (groups: string[][]) => groups.flat().filter((k) => !['view', 'open', 'copy', 'star'].includes(k));

describe('quickMenuKeys — hành động nghiệp vụ = đúng tập nút của menu thẻ V1', () => {
  const cases: [string, TaskStatus, string, Rel][] = [];
  for (const role of ROLES) for (const s of STATUSES) for (const mode of ['NEED_APPROVAL', 'IMMEDIATE']) for (const rel of RELS) cases.push([role, s, mode, rel]);
  it.each(cases)('%s · %s · %s · %s', (role, status, mode, rel) => {
    const task = mkTask(status, mode, rel);
    const p = useTaskPermissions(task, ME, role);
    const groups = quickMenuKeys(p, { canStar: role !== 'EMPLOYEE', isImportant: false, extensions: task.extensions });
    expect([...BUSINESS(groups)].sort()).toEqual([...v1CardMenu(p, task.extensions)].sort());
  });

  it('allFailed: người tạo (nhân viên) được Sửa + Hủy như V1; Admin KHÔNG có Giao lại trong menu (V1 thẻ không có)', () => {
    const t = mkTask('WAITING_ACKNOWLEDGE', 'IMMEDIATE', 'creator', {
      assignees: [{ id: 'a', status: 'REJECTED', user: { id: 'u-x', displayName: 'x', username: 'x', profile: null } }],
    });
    expect(BUSINESS(quickMenuKeys(useTaskPermissions(t, ME, 'EMPLOYEE'), { canStar: false, isImportant: false, extensions: [] }))).toEqual(['edit', 'cancel']);
    expect(BUSINESS(quickMenuKeys(useTaskPermissions(t, 'u-admin', 'ADMIN'), { canStar: true, isImportant: false, extensions: [] }))).not.toContain('reassign');
  });
});

describe('quickMenuKeys — nhóm + thứ tự theo preview (_SPEC §5)', () => {
  it('nhóm 1 luôn có Xem nhanh · Mở trang đầy đủ · Sao chép mã', () => {
    const p = useTaskPermissions(mkTask('COMPLETED', 'IMMEDIATE', 'other'), ME, 'EMPLOYEE');
    expect(quickMenuKeys(p, { canStar: false, isImportant: false, extensions: [] })).toEqual([['view', 'open', 'copy'], [], [], []]);
  });
  it('Boss · Chờ duyệt: Duyệt, Từ chối | Sửa, ★', () => {
    const p = useTaskPermissions(mkTask('PENDING_APPROVAL', 'NEED_APPROVAL', 'other'), ME, 'BOSS');
    expect(quickMenuKeys(p, { canStar: true, isImportant: false, extensions: [] }))
      .toEqual([['view', 'open', 'copy'], ['approve-plan', 'reject-plan'], ['edit', 'star'], []]);
  });
  it('Admin · Đang làm (có đơn gia hạn): Duyệt gia hạn | Sửa, ★ | Hủy', () => {
    const t = mkTask('IN_PROGRESS', 'NEED_APPROVAL', 'other');
    const p = useTaskPermissions(t, ME, 'ADMIN');
    expect(quickMenuKeys(p, { canStar: true, isImportant: true, extensions: t.extensions }))
      .toEqual([['view', 'open', 'copy'], ['approve-extension'], ['edit', 'star'], ['cancel']]);
  });
  it('Nhân viên · Đang làm (người làm, Phê duyệt): Báo cáo xong, Xin gia hạn, Chuyển giao; không Sửa (kế hoạch đã khoá — V1)', () => {
    const p = useTaskPermissions(mkTask('IN_PROGRESS', 'NEED_APPROVAL', 'assigneeInProgress'), ME, 'EMPLOYEE');
    expect(quickMenuKeys(p, { canStar: false, isImportant: false, extensions: [] }))
      .toEqual([['view', 'open', 'copy'], ['complete', 'extension', 'transfer'], [], []]);
  });
  it('Nhân viên · Chờ nhận việc: Nhận việc, Từ chối nhận', () => {
    const p = useTaskPermissions(mkTask('WAITING_ACKNOWLEDGE', 'IMMEDIATE', 'assigneePending'), ME, 'EMPLOYEE');
    expect(quickMenuKeys(p, { canStar: false, isImportant: false, extensions: [] })[1]).toEqual(['acknowledge', 'reject-task']);
  });
  it('Admin · Đã hủy: Khôi phục', () => {
    const p = useTaskPermissions(mkTask('CANCELLED', 'IMMEDIATE', 'other'), ME, 'ADMIN');
    expect(quickMenuKeys(p, { canStar: true, isImportant: false, extensions: [] })[1]).toEqual(['restore']);
  });
  it('Boss · Chờ nghiệm thu: Nghiệm thu, Yêu cầu làm lại', () => {
    const p = useTaskPermissions(mkTask('PENDING_REVIEW', 'NEED_APPROVAL', 'other'), ME, 'BOSS');
    expect(quickMenuKeys(p, { canStar: true, isImportant: false, extensions: [] })[1]).toEqual(['approve-review', 'reject-review']);
  });
});

describe('tiện ích dòng', () => {
  it('latestPendingExtension = đơn CHỜ có ngày xin XA NHẤT (V1 Bug 4)', () => {
    const e = (id: string, status: string, d: string) => ({ id, status, requestedDate: d });
    expect(latestPendingExtension([e('a', 'PENDING', '2026-11-01'), e('b', 'APPROVED', '2026-12-01'), e('c', 'PENDING', '2026-11-20')])?.id).toBe('c');
    expect(latestPendingExtension([e('b', 'APPROVED', '2026-12-01')])).toBeNull();
  });
  it('displayCode: việc Helpdesk hiện HD-{mã}, còn lại taskCode, thiếu → —', () => {
    expect(displayCode({ taskCode: '26-0001', hdNguonNhap: 'helpdesk', hdCode: '1234' })).toBe('HD-1234');
    expect(displayCode({ taskCode: '26-0001', hdNguonNhap: 'helpdesk', hdCode: null })).toBe('26-0001');
    expect(displayCode({ taskCode: null, hdNguonNhap: null, hdCode: null })).toBe('—');
  });
});
