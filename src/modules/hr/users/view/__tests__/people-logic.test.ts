import { describe, it, expect } from 'vitest';
import {
  actorHrFeatures, rowFeatures, rowActionGroups, selectableIds, toUsersQuery, exportHref, filterCount, withFilter,
  canSeeHistory, EMPTY_FILTERS, type PeopleFilters, type StatusFilter,
} from '../people-logic';
import {
  v1HrFeatures, v1RowFeatures, v1MenuItems, v1SelectableIds, v1UsersQuery, v1ExportUrl,
} from './v1-people.fixture';

const ROLES = ['ADMIN', 'BOSS', 'EMPLOYEE'] as const;
const FEATS = ['edit', 'deactivate', 'delete'] as const;
/** mọi tổ hợp quyền menu `hr` của nhân viên */
const featureSets: string[][] = [[], ['edit'], ['deactivate'], ['delete'], ['edit', 'deactivate'], ['edit', 'delete'], ['deactivate', 'delete'], [...FEATS]];
const hasOf = (fs: string[]) => (m: string, f: string) => m === 'hr' && fs.includes(f);

describe('actorHrFeatures — giống V1 page.tsx', () => {
  for (const role of ROLES) for (const fs of featureSets) {
    it(`${role} · hr=[${fs}]`, () => {
      expect(actorHrFeatures(role, hasOf(fs))).toEqual(v1HrFeatures(role, hasOf(fs)));
    });
  }
});

describe('rowActionGroups — đúng menu ⋯ V1 (trừ Lịch sử của người khác với nhân viên)', () => {
  const SELF = 'me';
  const targets = [
    { id: SELF, roleName: 'EMPLOYEE' }, { id: SELF, roleName: 'ADMIN' }, { id: SELF, roleName: 'BOSS' },
    { id: 'a', roleName: 'ADMIN' }, { id: 'b', roleName: 'BOSS' }, { id: 'e', roleName: 'EMPLOYEE' },
  ];
  let n = 0;
  for (const actor of ROLES) for (const fs of featureSets) for (const t of targets)
    for (const isActive of [true, false]) for (const email of [null, 'x@pmh.vn']) for (const hasTasks of [true, false]) {
      // chính mình phải cùng vai trò với người đang đăng nhập
      if (t.id === SELF && t.roleName !== actor) continue;
      n++;
      it(`#${n} ${actor} hr=[${fs}] → ${t.id}/${t.roleName} active=${isActive} email=${!!email} tasks=${hasTasks}`, () => {
        const actorPrivileged = actor !== 'EMPLOYEE';
        const hr = v1HrFeatures(actor, hasOf(fs));
        const user = { id: t.id, roleName: t.roleName, isActive, email, hasTasks };
        const ctx = { selfId: SELF, actorPrivileged, hrFeatures: hr };
        expect(rowFeatures({ isSelf: t.id === SELF, actorPrivileged, hrFeatures: hr })).toEqual(v1RowFeatures(t.id === SELF, actorPrivileged, t.roleName, hr));
        const v1 = v1MenuItems(user, v1RowFeatures(t.id === SELF, actorPrivileged, t.roleName, hr));
        const expected = canSeeHistory(user, ctx) ? v1 : v1.filter((k) => k !== 'history');
        expect(rowActionGroups(user, ctx).flat()).toEqual(expected);
      });
    }
});

describe('Lịch sử hoạt động: nhân viên chỉ xem của chính mình (sửa lỗi nhãn V1)', () => {
  it('nhân viên không có mục Lịch sử ở dòng người khác', () => {
    const groups = rowActionGroups({ id: 'x', roleName: 'EMPLOYEE', isActive: true, email: null, hasTasks: false }, { selfId: 'me', actorPrivileged: false, hrFeatures: ['edit', 'change_password'] });
    expect(groups).toEqual([]);
  });
  it('nhân viên vẫn có Lịch sử + Sửa ở dòng của mình', () => {
    const groups = rowActionGroups({ id: 'me', roleName: 'EMPLOYEE', isActive: true, email: null, hasTasks: false }, { selfId: 'me', actorPrivileged: false, hrFeatures: ['edit', 'change_password'] });
    expect(groups).toEqual([['history'], ['edit']]);
  });
  it('Boss xem lịch sử người khác', () => {
    const groups = rowActionGroups({ id: 'x', roleName: 'EMPLOYEE', isActive: false, email: 'a@b.vn', hasTasks: true }, { selfId: 'me', actorPrivileged: true, hrFeatures: ['edit', 'deactivate', 'delete', 'change_password'] });
    expect(groups).toEqual([['history'], ['edit', 'password', 'resetLink'], ['activate']]);
  });
});

describe('selectableIds — V1', () => {
  const users = [{ id: 'me' }, { id: 'a' }, { id: 'b' }];
  for (const p of [true, false]) it(`privileged=${p}`, () => expect(selectableIds(users, 'me', p)).toEqual(v1SelectableIds(users, 'me', p)));
});

describe('toUsersQuery / exportHref — URL giống V1', () => {
  const cases: PeopleFilters[] = [];
  const statuses: StatusFilter[] = ['all', 'active', 'inactive'];
  for (const search of ['', 'nguyễn an']) for (const roleId of ['', 'ckrole1']) for (const status of statuses)
    for (const [createdFrom, createdTo] of [['', ''], ['2026-10-01', ''], ['', '2026-10-31'], ['2026-10-01', '2026-10-31']])
      for (const page of [1, 3]) cases.push({ search, roleId, status, createdFrom, createdTo, page });
  it.each(cases)('%j', (f) => {
    const q = toUsersQuery(f);
    const p = new URLSearchParams();
    if (q.search) p.set('search', q.search);
    if (q.roleId) p.set('roleId', q.roleId);
    if (q.isActive !== undefined) p.set('isActive', String(q.isActive));
    if (q.page) p.set('page', String(q.page));
    if (q.createdFrom) p.set('createdFrom', q.createdFrom);
    if (q.createdTo) p.set('createdTo', q.createdTo);
    const v1s = { search: f.search, roleId: f.roleId, isActive: f.status, createdFrom: f.createdFrom, createdTo: f.createdTo, page: f.page };
    expect(`/api/hr/users?${p.toString()}`).toBe(v1UsersQuery(v1s));
    expect(exportHref(f)).toBe(v1ExportUrl(v1s));
  });
});

describe('bộ lọc', () => {
  it('đổi bộ lọc về trang 1', () => {
    expect(withFilter({ ...EMPTY_FILTERS, page: 4 }, 'roleId', 'r1')).toEqual({ ...EMPTY_FILTERS, roleId: 'r1', page: 1 });
  });
  it('đếm bộ lọc (khoảng ngày tính 1)', () => {
    expect(filterCount(EMPTY_FILTERS)).toBe(0);
    expect(filterCount({ ...EMPTY_FILTERS, search: 'x' })).toBe(0);
    expect(filterCount({ ...EMPTY_FILTERS, roleId: 'r', status: 'inactive', createdFrom: 'a', createdTo: 'b' })).toBe(3);
  });
});
