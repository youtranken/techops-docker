import { describe, it, expect } from 'vitest';
import vi from '../../../../../messages/vi.json';
import en from '../../../../../messages/en.json';
import {
  taskLogUrl, userLogUrl, taskRefUrl, TASK_FILTER_ACTIONS, USER_FILTER_ACTIONS, groupActions,
  TASK_ACTION_GROUPS, USER_ACTION_GROUPS, taskGroup, userGroup, taskActionKey, userActionKey,
  dayKey, timeHM, fullDateTime, dayHeading, startsNewDay, userDetail, taskChanges, type Msg,
} from '../log-logic';
import { v1TaskParams, v1UserParams, v1RefParams, V1_TASK_ACTIONS, V1_USER_ACTIONS, v1LogDetailText } from './v1-logs.fixture';

const ALL_TASK = ['TASK_CREATED', 'TASK_UPDATED', 'TASK_CANCELLED', 'TASK_DELETED', 'PLAN_APPROVED', 'PLAN_REJECTED', 'ACKNOWLEDGED',
  'REJECTED', 'TRANSFERRED', 'COMPLETED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'REASSIGNED', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED',
  'EXTENSION_REJECTED', 'EXTENSION_WITHDRAWN', 'FORCE_MODE_TOGGLED', 'COMMENT_ADDED', 'STATUS_CHANGED', 'REPORT_SUPPLEMENTED'];
const ALL_USER = ['LOGIN', 'LOGOUT', 'SESSION_TIMEOUT', 'LOGIN_FAILED', 'VIEW_PAGE', 'EXPORT_DATA', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
  'DEACTIVATE_USER', 'ACTIVATE_USER', 'RESET_PASSWORD', 'CHANGE_SETTINGS', 'REVOKE_SESSION', 'PASSWORD_CHANGED_SELF', 'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED', 'RATE_LIMIT_EXCEEDED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PASSWORD_POLICY_VIOLATION', 'SECURITY_SETTING_CHANGED'];

function get(obj: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

describe('URL gửi API — giống hệt V1', () => {
  const taskCases = [
    {}, { page: 1, limit: 20 },
    { taskTitle: 'máy in & mạng', userId: 'u1', action: 'REVIEW_APPROVED', dateFrom: '2026-10-01', dateTo: '2026-10-24', page: 3, limit: 20 },
    { taskTitle: '', userId: undefined, page: 2, limit: 20 },
  ];
  it.each(taskCases)('nhật ký công việc %#', (f) => expect(taskLogUrl(f)).toBe(v1TaskParams(f)));
  const userCases = [
    {}, { page: 1, limit: 20 },
    { userId: 'UNKNOWN', action: 'LOGIN_FAILED', ipType: 'external', dateFrom: '2026-10-01', dateTo: '2026-10-02', page: 2, limit: 20 },
  ];
  it.each(userCases)('nhật ký người dùng %#', (f) => expect(userLogUrl(f)).toBe(v1UserParams(f)));
  const refCases = [
    {}, { page: 1, limit: 20 },
    { search: '26-0012', creatorId: 'c1', scheduleFrom: '2026-10-01', scheduleTo: '2026-10-31', page: 4, limit: 20 },
  ];
  it.each(refCases)('tra cứu mã %#', (f) => expect(taskRefUrl(f)).toBe(v1RefParams(f)));
});

describe('ô lọc hành động — đúng tập V1', () => {
  it('công việc: 20 giá trị V1, đúng thứ tự', () => expect(TASK_FILTER_ACTIONS).toEqual(V1_TASK_ACTIONS));
  it('người dùng: 11 giá trị V1, đúng thứ tự', () => expect(USER_FILTER_ACTIONS).toEqual(V1_USER_ACTIONS));
  it('nhóm theo preview nhưng không thêm/bớt giá trị', () => {
    const g = groupActions(TASK_FILTER_ACTIONS, TASK_ACTION_GROUPS);
    expect(g.flatMap((x) => x.actions).sort()).toEqual([...V1_TASK_ACTIONS].sort());
    expect(g.every((x) => x.actions.length > 0)).toBe(true);
    const u = groupActions(USER_FILTER_ACTIONS, USER_ACTION_GROUPS);
    expect(u.flatMap((x) => x.actions).sort()).toEqual([...V1_USER_ACTIONS].sort());
  });
});

describe('nhãn + nhóm màu hành động', () => {
  it('mọi TaskAction có nhãn song ngữ', () => {
    for (const a of ALL_TASK) {
      const k = taskActionKey({ action: a, details: null })!;
      expect(k, a).toBe(`lg.a.${a}`);
      expect(typeof get(vi, k), k).toBe('string');
      expect(typeof get(en, k), k).toBe('string');
      expect(taskGroup(a)).not.toBe('other');
    }
  });
  it('REVIEW_APPROVED = "Nghiệm thu", không còn nhãn sai "Chờ Review" của V1', () => {
    expect(get(vi, taskActionKey({ action: 'REVIEW_APPROVED', details: null })!)).toBe('Nghiệm thu');
    expect(taskGroup('REVIEW_APPROVED')).toBe('done');
  });
  it('khôi phục / báo cáo phần mình', () => {
    expect(taskActionKey({ action: 'STATUS_CHANGED', details: { restored: true } })).toBe('lg.a.RESTORED');
    expect(taskActionKey({ action: 'COMPLETED', details: { reportVersion: 'v1.0', partial: true } })).toBe('lg.a.COMPLETED_PART');
    expect(taskActionKey({ action: 'COMPLETED', details: { reportVersion: 'v1.0' } })).toBe('lg.a.COMPLETED');
  });
  it('hành động lạ → null (hiện mã gốc)', () => {
    expect(taskActionKey({ action: 'FOO', details: null })).toBeNull();
    expect(userActionKey('BAR')).toBeNull();
    expect(taskGroup('FOO')).toBe('other');
  });
  it('mọi UserAction có nhãn song ngữ + nhóm', () => {
    for (const a of ALL_USER) {
      const k = userActionKey(a)!;
      expect(typeof get(vi, k), k).toBe('string');
      expect(typeof get(en, k), k).toBe('string');
      expect(userGroup(a)).not.toBe('other');
    }
    expect(userGroup('LOGIN_FAILED')).toBe('alert');
  });
});

describe('ngày giờ theo múi giờ app (UTC+7)', () => {
  it('dayKey / timeHM', () => {
    expect(dayKey('2026-10-23T17:30:00.000Z')).toBe('2026-10-24');
    expect(dayKey('2026-10-23T16:59:59.000Z')).toBe('2026-10-23');
    expect(timeHM('2026-10-23T17:05:00.000Z')).toBe('00:05');
  });
  it('fullDateTime vi/en', () => {
    expect(fullDateTime('2026-10-23T17:05:09.000Z', 'vi')).toBe('24/10/2026 00:05:09');
    expect(fullDateTime('2026-10-23T17:05:09.000Z', 'en')).toBe('Oct 24, 2026 00:05:09');
  });
  it('dayHeading: hôm nay / hôm qua / ngày', () => {
    const now = new Date('2026-10-24T03:00:00.000Z');
    expect(dayHeading('2026-10-24', now)).toBe('today');
    expect(dayHeading('2026-10-23', now)).toBe('yday');
    expect(dayHeading('2026-10-01', now)).toBe('date');
  });
  it('startsNewDay: dòng đầu + mỗi lần đổi ngày', () => {
    const rows = ['2026-10-24T01:00:00Z', '2026-10-23T18:00:00Z', '2026-10-23T16:00:00Z'].map((createdAt) => ({ createdAt }));
    expect(rows.map((_, i) => startsNewDay(rows, i))).toEqual([true, false, true]);
  });
});

describe('chi tiết nhật ký người dùng — cùng thông tin với V1 logDetailText, song ngữ', () => {
  const cases: (Record<string, unknown> | null)[] = [
    null, {},
    { reason: 'USER_NOT_FOUND', attemptedUsername: 'root' }, { reason: 'USER_INACTIVE' },
    { reason: 'WRONG_PASSWORD', attemptsRemaining: 3 }, { reason: 'WRONG_PASSWORD', locked: true }, { reason: 'WRONG_PASSWORD' },
    { setting: 'security_config', action: 'reset_to_default' }, { setting: 'security_config', changes: ['maxAttempts', 'lockMinutes'] },
    { setting: 'security_config' }, { setting: 'notification_prefs', emailEnabled: true }, { setting: 'notification_prefs', emailEnabled: false },
    { setting: 'smtp', host: 'x' }, { setting: 'task_type_created', name: 'Mạng' }, { setting: 'priority_created', name: 'Gấp' },
    { setting: 'digest_config', enabled: true }, { setting: 'email_template', key: 'TASK_ASSIGNED' }, { setting: 'overdue_reminder', enabled: true },
  ];
  it.each(cases)('trường hợp %#: có/không có chữ như V1', (m) => {
    expect(userDetail(m) === null).toBe(v1LogDetailText(m) === null);
  });
  it('ánh xạ khoá', () => {
    expect(userDetail({ reason: 'WRONG_PASSWORD', attemptsRemaining: 3 })).toEqual({ key: 'lg.r.left', values: { n: 3 } });
    expect(userDetail({ reason: 'WRONG_PASSWORD', locked: true })).toEqual({ key: 'lg.r.locked' });
    expect(userDetail({ setting: 'notification_prefs', emailEnabled: false })).toEqual({ key: 'lgx.d.notif', values: { v: { key: 'lg.v.off' } } });
    expect(userDetail({ setting: 'security_config', changes: ['a', 'b'] })).toEqual({ key: 'lgx.d.secChg', values: { x: 'a, b' } });
    // giá trị lạ: giữ chuỗi gốc như V1 (Phase B)
    expect(userDetail({ setting: 'overdue_reminder' })).toEqual({ raw: 'overdue_reminder' });
  });
});

describe('thay đổi của sự kiện công việc', () => {
  const base = { oldStatus: null, newStatus: null, details: null } as const;
  const names = (id: string) => ({ u1: 'Lê Minh', u2: 'Trần An' } as Record<string, string>)[id];

  it('TASK_UPDATED: tên trường + giá trị V1 (chuỗi tiếng Việt) dịch được, còn lại giữ nguyên', () => {
    const r = taskChanges({ ...base, action: 'TASK_UPDATED', oldStatus: 'IN_PROGRESS', newStatus: 'IN_PROGRESS', details: { changes: [
      { field: 'Hạn chót', oldValue: '20/10/2026', newValue: '22/10/2026' },
      { field: 'Quy trình', oldValue: 'Trực tiếp', newValue: 'Phê duyệt' },
      { field: 'Force Mode', oldValue: 'Tắt', newValue: 'Bật' },
      { field: 'Nội dung', oldValue: '', newValue: '' },
      { field: 'Thêm người TH', oldValue: '', newValue: 'Lê Minh' },
      { field: 'Trường lạ', oldValue: 'a', newValue: 'b' },
    ] } }, names);
    expect(r.rows).toEqual([
      { field: { key: 'lg.fld.due' }, old: { raw: '20/10/2026' }, new: { raw: '22/10/2026' } },
      { field: { key: 'lg.fld.mode' }, old: { key: 'td.mode.direct' }, new: { key: 'td.mode.approval' } },
      { field: { key: 'lg.fld.force' }, old: { key: 'lg.v.off' }, new: { key: 'lg.v.on' } },
      { field: { key: 'lgx.fld.content' }, old: null, new: { key: 'lgx.v.edited' } },
      { field: { key: 'lgx.fld.addAs' }, old: null, new: { raw: 'Lê Minh' } },
      { field: { raw: 'Trường lạ' }, old: { raw: 'a' }, new: { raw: 'b' } },
    ]);
    expect(r.sameStatus).toBe(true);
    expect(r.summary[0]).toEqual({ key: 'lgx.chg.field', values: { f: { key: 'lg.fld.due' }, o: { raw: '20/10/2026' }, n: { raw: '22/10/2026' } } });
    expect(r.summary).toHaveLength(6);
  });

  it('đổi trạng thái → dòng Trạng thái đầu bảng + ý tóm tắt cuối', () => {
    const r = taskChanges({ ...base, action: 'PLAN_REJECTED', oldStatus: 'PENDING_APPROVAL', newStatus: 'CANCELLED', details: { reason: 'Trùng việc' } }, names);
    expect(r.rows[0]).toEqual({ field: { key: 'lg.fld.status' }, old: { status: 'PENDING_APPROVAL' }, new: { status: 'CANCELLED' } });
    expect(r.reasons).toEqual(['Trùng việc']);
    expect(r.summary).toEqual([{ quote: 'Trùng việc' }, { key: 'lgx.chg.status', values: { o: { status: 'PENDING_APPROVAL' }, n: { status: 'CANCELLED' } } }]);
  });

  // id không tra được tên (nhân viên chỉ có danh sách gồm chính mình) → "+k" thay cho mã cuid
  it('tạo việc: giao cho (tên từ danh sách người dùng) + quy trình', () => {
    const r = taskChanges({ ...base, action: 'TASK_CREATED', newStatus: 'WAITING_ACKNOWLEDGE', details: { assigneeIds: ['u1', 'u9'], workflowMode: 'IMMEDIATE' } }, names);
    expect(r.summary[0]).toEqual({ key: 'lg.chg.assign', values: { p: { raw: 'Lê Minh +1' } } });
    expect(r.rows).toContainEqual({ field: { key: 'lg.fld.mode' }, old: null, new: { key: 'td.mode.direct' } });
    expect(r.rows[0]).toEqual({ field: { key: 'lg.fld.status' }, old: null, new: { status: 'WAITING_ACKNOWLEDGE' } });
  });

  it('gia hạn / chuyển giao / giao lại / báo cáo / bình luận', () => {
    expect(taskChanges({ ...base, action: 'EXTENSION_REQUESTED', details: { requestedDate: '2026-10-28T00:00:00.000Z', reason: 'Chờ hãng' } }, names).summary)
      .toEqual([{ quote: 'Chờ hãng' }, { key: 'lg.chg.ext', values: { d: { date: '2026-10-28T00:00:00.000Z' } } }]);
    expect(taskChanges({ ...base, action: 'EXTENSION_APPROVED', details: { newDeadline: '2026-11-28T00:00:00.000Z' } }, names).summary)
      .toEqual([{ key: 'lg.chg.newDue', values: { d: { date: '2026-11-28T00:00:00.000Z' } } }]);
    const tr = taskChanges({ ...base, action: 'TRANSFERRED', details: { transferTo: 'u2', transferToName: 'Trần An', notes: 'Nhờ An' } }, names);
    expect(tr.summary[0]).toEqual({ key: 'lg.chg.to', values: { p: { raw: 'Trần An' } } });
    expect(tr.note).toBe('Nhờ An');
    expect(taskChanges({ ...base, action: 'TRANSFERRED', details: { isRestore: true, rejectedByName: 'An', restoredToName: 'Minh' } }, names).summary[0])
      .toEqual({ key: 'lgx.chg.restore', values: { a: { raw: 'An' }, b: { raw: 'Minh' } } });
    expect(taskChanges({ ...base, action: 'REASSIGNED', details: { newAssigneeIds: ['u1', 'u2'] } }, names).summary[0])
      .toEqual({ key: 'lg.chg.reassign', values: { p: { raw: 'Lê Minh, Trần An' } } });
    expect(taskChanges({ ...base, action: 'REPORT_SUPPLEMENTED', details: { reportVersion: 'v1.1' } }, names).summary[0])
      .toEqual({ key: 'lg.chg.ver', values: { v: 'v1.1' } });
    expect(taskChanges({ ...base, action: 'COMMENT_ADDED', details: { commentId: 'c', event: 'deleted' } }, names).summary[0])
      .toEqual({ key: 'lgx.chg.cmDel' });
    const rr = taskChanges({ ...base, action: 'REVIEW_REJECTED', details: { entries: [{ assigneeId: 'a1', reason: 'Thiếu ảnh' }, { reason: 'Làm lại' }] } }, names);
    expect(rr.reasons).toEqual(['Thiếu ảnh', 'Làm lại']);
  });

  it('không có gì → rỗng', () => {
    const r = taskChanges({ ...base, action: 'EXTENSION_WITHDRAWN', oldStatus: 'IN_PROGRESS', newStatus: 'IN_PROGRESS' }, names);
    expect(r.summary).toEqual([]);
    expect(r.rows).toEqual([]);
  });
  it('Msg là kiểu hợp lệ', () => { const m: Msg = { raw: 'x' }; expect(m).toBeTruthy(); });
});
