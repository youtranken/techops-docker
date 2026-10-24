/**
 * Logic thuần trang Nhật ký V2 (A3-6) — không React, có test đối chiếu V1 (`__tests__/v1-logs.fixture.ts`).
 * - URL gửi API: giống hệt hooks V1 (cùng tham số, cùng thứ tự).
 * - Ô lọc hành động: đúng tập giá trị V1 (công việc 20, người dùng 11), chỉ nhóm lại theo preview.
 * - Nhãn/nhóm màu hành động, ngày giờ theo múi giờ app (UTC+7), diễn giải `details`/`metadata` đã lưu thành Msg song ngữ.
 *   Chuỗi tiếng Việt lưu sẵn trong log (tên trường lạ, lý do, ghi chú, tên mức ưu tiên…) để nguyên — Phase B.
 */
import { APP_TIMEZONE, formatDate } from '@/i18n/format';
import type { Locale } from '@/i18n/locale';
import type { TaskLogFilters, UserLogFilters, TaskRefFilters } from '../types';

/* ---------- Msg: câu song ngữ dựng ở component ---------- */
export type Msg =
  | { key: string; values?: Record<string, string | number | Msg> }
  | { raw: string }
  | { date: string }
  | { status: string }
  | { quote: string };

/* ---------- URL gửi API (giữ V1) ---------- */
function build(pairs: [string, string | number | undefined][]): string {
  const params = new URLSearchParams();
  for (const [k, v] of pairs) if (v) params.set(k, String(v));
  return params.toString();
}
export const taskLogUrl = (f: TaskLogFilters = {}) =>
  `/api/logs/tasks?${build([['taskTitle', f.taskTitle], ['userId', f.userId], ['action', f.action], ['dateFrom', f.dateFrom], ['dateTo', f.dateTo], ['page', f.page], ['limit', f.limit]])}`;
export const userLogUrl = (f: UserLogFilters = {}) =>
  `/api/logs/users?${build([['userId', f.userId], ['action', f.action], ['ipType', f.ipType], ['dateFrom', f.dateFrom], ['dateTo', f.dateTo], ['page', f.page], ['limit', f.limit]])}`;
export const taskRefUrl = (f: TaskRefFilters = {}) =>
  `/api/logs/task-reference?${build([['search', f.search], ['creatorId', f.creatorId], ['scheduleFrom', f.scheduleFrom], ['scheduleTo', f.scheduleTo], ['page', f.page], ['limit', f.limit]])}`;

/** Cỡ trang V1 (cố định 20, không có ô chọn) */
export const LOG_PAGE_SIZE = 20;

/* ---------- Hành động ---------- */
export const TASK_FILTER_ACTIONS = [
  'TASK_CREATED', 'TASK_UPDATED', 'TASK_CANCELLED', 'TASK_DELETED', 'PLAN_APPROVED', 'PLAN_REJECTED',
  'ACKNOWLEDGED', 'REJECTED', 'TRANSFERRED', 'COMPLETED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'REASSIGNED',
  'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'EXTENSION_WITHDRAWN', 'FORCE_MODE_TOGGLED',
  'COMMENT_ADDED', 'STATUS_CHANGED',
];
export const USER_FILTER_ACTIONS = [
  'LOGIN', 'LOGOUT', 'SESSION_TIMEOUT', 'LOGIN_FAILED', 'VIEW_PAGE', 'EXPORT_DATA',
  'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'RESET_PASSWORD', 'CHANGE_SETTINGS',
];

export type TaskGroup = 'create' | 'flow' | 'done' | 'ext' | 'neg';
export type UserGroup = 'session' | 'alert' | 'account' | 'system';

/** Nhóm theo preview logs.html (`TG`, `UG`) — chỉ dùng cho màu chấm + optgroup ô lọc */
export const TASK_ACTION_GROUPS: Record<TaskGroup, string[]> = {
  create: ['TASK_CREATED', 'TASK_UPDATED', 'COMMENT_ADDED', 'FORCE_MODE_TOGGLED', 'STATUS_CHANGED'],
  flow: ['PLAN_APPROVED', 'ACKNOWLEDGED', 'TRANSFERRED', 'REASSIGNED'],
  done: ['COMPLETED', 'REPORT_SUPPLEMENTED', 'REVIEW_APPROVED'],
  ext: ['EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'EXTENSION_WITHDRAWN'],
  neg: ['PLAN_REJECTED', 'REJECTED', 'REVIEW_REJECTED', 'TASK_CANCELLED', 'TASK_DELETED'],
};
export const USER_ACTION_GROUPS: Record<UserGroup, string[]> = {
  session: ['LOGIN', 'LOGOUT', 'SESSION_TIMEOUT', 'REVOKE_SESSION'],
  alert: ['LOGIN_FAILED', 'RATE_LIMIT_EXCEEDED', 'ACCOUNT_LOCKED', 'PASSWORD_POLICY_VIOLATION'],
  account: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'DEACTIVATE_USER', 'ACTIVATE_USER', 'RESET_PASSWORD', 'ACCOUNT_UNLOCKED',
    'PASSWORD_CHANGED_SELF', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED'],
  system: ['CHANGE_SETTINGS', 'SECURITY_SETTING_CHANGED', 'EXPORT_DATA', 'VIEW_PAGE'],
};

function groupOf<G extends string>(groups: Record<G, string[]>, a: string): G | 'other' {
  for (const g of Object.keys(groups) as G[]) if (groups[g].includes(a)) return g;
  return 'other';
}
export const taskGroup = (a: string) => groupOf(TASK_ACTION_GROUPS, a);
export const userGroup = (a: string) => groupOf(USER_ACTION_GROUPS, a);

/** Chia danh sách giá trị ô lọc (V1) theo nhóm preview; giữ thứ tự nhóm, bỏ nhóm rỗng. */
export function groupActions<G extends string>(list: string[], groups: Record<G, string[]>): { group: G | 'other'; actions: string[] }[] {
  const out = (Object.keys(groups) as G[]).map((g) => ({ group: g as G | 'other', actions: list.filter((a) => groups[g].includes(a)) }));
  const rest = list.filter((a) => groupOf(groups, a) === 'other');
  if (rest.length) out.push({ group: 'other', actions: rest });
  return out.filter((x) => x.actions.length > 0);
}

const ALL_TASK = new Set(Object.values(TASK_ACTION_GROUPS).flat());
const ALL_USER = new Set(Object.values(USER_ACTION_GROUPS).flat());

type Details = Record<string, unknown> | null | undefined;

/** Khoá nhãn hành động công việc. V1 gán nhầm REVIEW_APPROVED = "Chờ Review" — nay "Nghiệm thu" (chỉ đổi nhãn hiển thị). */
export function taskActionKey(log: { action: string; details: Details }): string | null {
  const d = log.details ?? {};
  if (log.action === 'STATUS_CHANGED' && d.restored) return 'lg.a.RESTORED';
  if (log.action === 'COMPLETED' && d.partial) return 'lg.a.COMPLETED_PART';
  return ALL_TASK.has(log.action) ? `lg.a.${log.action}` : null;
}
export const userActionKey = (a: string) => (ALL_USER.has(a) ? `lg.u.${a}` : null);

/* ---------- Ngày giờ (múi giờ app) ---------- */
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(key: string, make: () => Intl.DateTimeFormat) {
  let f = fmtCache.get(key);
  if (!f) { f = make(); fmtCache.set(key, f); }
  return f;
}
export function dayKey(v: string | Date, tz: string = APP_TIMEZONE): string {
  return fmt(`d|${tz}`, () => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })).format(new Date(v));
}
function time(v: string | Date, seconds: boolean, tz: string) {
  return fmt(`t|${seconds}|${tz}`, () => new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hourCycle: 'h23',
  })).format(new Date(v));
}
export const timeHM = (v: string | Date, tz: string = APP_TIMEZONE) => time(v, false, tz);
export const fullDateTime = (v: string | Date, locale: Locale, tz: string = APP_TIMEZONE) => `${formatDate(v, locale, tz)} ${time(v, true, tz)}`;

function prevDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
export function dayHeading(key: string, now: Date, tz: string = APP_TIMEZONE): 'today' | 'yday' | 'date' {
  const today = dayKey(now, tz);
  return key === today ? 'today' : key === prevDay(today) ? 'yday' : 'date';
}
export function startsNewDay(rows: { createdAt: string }[], i: number, tz: string = APP_TIMEZONE): boolean {
  return i === 0 || dayKey(rows[i].createdAt, tz) !== dayKey(rows[i - 1].createdAt, tz);
}

/* ---------- Chi tiết nhật ký người dùng (cùng thông tin V1 logDetailText) ---------- */
const onOff = (v: unknown): Msg => ({ key: v ? 'lg.v.on' : 'lg.v.off' });
export function userDetail(m: Details): Msg | null {
  if (!m) return null;
  const reason = m.reason as string | undefined;
  if (reason === 'USER_NOT_FOUND') return { key: 'lg.r.USER_NOT_FOUND' };
  if (reason === 'USER_INACTIVE') return { key: 'lg.r.USER_INACTIVE' };
  if (reason === 'WRONG_PASSWORD') {
    if (m.locked) return { key: 'lg.r.locked' };
    if (typeof m.attemptsRemaining === 'number') return { key: 'lg.r.left', values: { n: m.attemptsRemaining } };
    return { key: 'lg.r.WRONG_PASSWORD' };
  }
  const s = m.setting as string | undefined;
  if (!s) return null;
  if (s === 'security_config') {
    if (m.action === 'reset_to_default') return { key: 'lgx.d.secReset' };
    const changes = m.changes as string[] | undefined;
    return changes?.length ? { key: 'lgx.d.secChg', values: { x: changes.join(', ') } } : { key: 'lgx.d.sec' };
  }
  if (s === 'notification_prefs') return { key: 'lgx.d.notif', values: { v: onOff(m.emailEnabled) } };
  if (s === 'smtp') return { key: 'lgx.d.smtp' };
  if (s === 'task_type_created') return { key: 'lgx.d.taskType', values: { x: String(m.name ?? '') } };
  if (s === 'priority_created') return { key: 'lgx.d.priority', values: { x: String(m.name ?? '') } };
  if (s === 'digest_config') return { key: 'lg.d.digest', values: { v: onOff(m.enabled) } };
  if (s === 'email_template') return { key: 'lgx.d.tpl', values: { x: String(m.key ?? '') } };
  return { raw: s };
}

/* ---------- Thay đổi của sự kiện công việc ---------- */
export interface ChangeRow { field: Msg; old: Msg | null; new: Msg | null }
export interface TaskChanges {
  /** Ý tóm tắt cho cột "Thay đổi" (ý đầu + "+n") */
  summary: Msg[];
  /** Bảng Mục / Trước / Sau trong ngăn chi tiết */
  rows: ChangeRow[];
  reasons: string[];
  note: string | null;
  /** Trạng thái không đổi (có cả cũ và mới, bằng nhau) */
  sameStatus: boolean;
}

/** Tên trường V1 ghi trong details.changes (task-update.service.ts) → khoá song ngữ */
const FIELD_KEYS: Record<string, string> = {
  'Tiêu đề': 'lgx.fld.title', 'Nội dung': 'lgx.fld.content', 'Ngày bắt đầu': 'lg.fld.start', 'Hạn chót': 'lg.fld.due',
  'Force Mode': 'lg.fld.force', 'Quan trọng': 'lgx.fld.important', 'Quy trình': 'lg.fld.mode', 'Độ ưu tiên': 'lg.fld.priority',
  'Loại công việc': 'lgx.fld.type', 'Thêm người TH': 'lgx.fld.addAs', 'Xóa người TH': 'lgx.fld.rmAs',
};
const VALUE_KEYS: Record<string, string> = { 'Bật': 'lg.v.on', 'Tắt': 'lg.v.off', 'Trực tiếp': 'td.mode.direct', 'Phê duyệt': 'td.mode.approval' };
const modeKey = (m: unknown) => (m === 'IMMEDIATE' ? 'td.mode.direct' : m === 'NEED_APPROVAL' ? 'td.mode.approval' : null);
const val = (v: unknown): Msg | null => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v);
  return VALUE_KEYS[s] ? { key: VALUE_KEYS[s] } : { raw: s };
};
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

export function taskChanges(
  log: { action: string; oldStatus: string | null; newStatus: string | null; details: Details },
  nameOf: (id: string) => string | undefined,
): TaskChanges {
  const d = log.details ?? {};
  // id không có trong danh sách người dùng (nhân viên chỉ nhận được chính mình; người đã khoá) → gộp "+k", không hiện mã cuid
  const names = (ids: unknown) => {
    if (!Array.isArray(ids) || !ids.length) return '';
    const known = ids.map((id) => nameOf(String(id))).filter((x): x is string => !!x);
    const k = ids.length - known.length;
    return [known.join(', '), k ? `+${k}` : ''].filter(Boolean).join(' ');
  };
  const summary: Msg[] = [];
  const rows: ChangeRow[] = [];
  const reasons: string[] = [];
  let note: string | null = null;

  const reason = str(d.reason);
  if (reason) reasons.push(reason);
  if (log.action === 'REVIEW_REJECTED' && Array.isArray(d.entries)) {
    for (const e of d.entries as { reason?: unknown }[]) { const r = str(e?.reason); if (r) reasons.push(r); }
  }
  if (reason) summary.push({ quote: reason });

  switch (log.action) {
    case 'TASK_CREATED': {
      const p = names(d.assigneeIds);
      if (p) summary.push({ key: 'lg.chg.assign', values: { p: { raw: p } } });
      if (p) rows.push({ field: { key: 'lg.fld.assignee' }, old: null, new: { raw: p } });
      const mk = modeKey(d.workflowMode);
      if (mk) rows.push({ field: { key: 'lg.fld.mode' }, old: null, new: { key: mk } });
      if (d.source === 'helpdesk') summary.push({ key: 'lgx.chg.hd', values: { x: String(d.hdCode ?? d.hdId ?? '') } });
      break;
    }
    case 'TASK_UPDATED': {
      const changes = Array.isArray(d.changes) ? (d.changes as { field?: unknown; oldValue?: unknown; newValue?: unknown }[]) : [];
      for (const c of changes) {
        const f = String(c.field ?? '');
        const field: Msg = FIELD_KEYS[f] ? { key: FIELD_KEYS[f] } : { raw: f };
        const row: ChangeRow = f === 'Nội dung'
          ? { field, old: null, new: { key: 'lgx.v.edited' } }
          : { field, old: val(c.oldValue), new: val(c.newValue) };
        rows.push(row);
        summary.push({ key: 'lgx.chg.field', values: { f: field, o: row.old ?? { raw: '—' }, n: row.new ?? { raw: '—' } } });
      }
      break;
    }
    case 'EXTENSION_REQUESTED':
      if (str(d.requestedDate)) {
        summary.push({ key: 'lg.chg.ext', values: { d: { date: d.requestedDate as string } } });
        rows.push({ field: { key: 'lgx.fld.extTo' }, old: null, new: { date: d.requestedDate as string } });
      }
      break;
    case 'EXTENSION_APPROVED':
      if (str(d.newDeadline)) {
        summary.push({ key: 'lg.chg.newDue', values: { d: { date: d.newDeadline as string } } });
        rows.push({ field: { key: 'lg.fld.due' }, old: null, new: { date: d.newDeadline as string } });
      }
      break;
    case 'TRANSFERRED':
      if (d.isRestore) {
        summary.push({ key: 'lgx.chg.restore', values: { a: { raw: String(d.rejectedByName ?? '—') }, b: { raw: String(d.restoredToName ?? nameOf(String(d.restoredTo)) ?? '—') } } });
      } else {
        const to = str(d.transferToName) ?? (d.transferTo ? nameOf(String(d.transferTo)) ?? String(d.transferTo) : null);
        if (to) {
          summary.push({ key: 'lg.chg.to', values: { p: { raw: to } } });
          rows.push({ field: { key: 'lg.fld.assignee' }, old: null, new: { raw: to } });
        }
        note = str(d.notes);
      }
      break;
    case 'REASSIGNED': {
      const p = names(d.newAssigneeIds);
      if (p) {
        summary.push({ key: 'lg.chg.reassign', values: { p: { raw: p } } });
        rows.push({ field: { key: 'lg.fld.assignee' }, old: null, new: { raw: p } });
      }
      break;
    }
    case 'COMPLETED':
    case 'REPORT_SUPPLEMENTED':
      if (str(d.reportVersion)) {
        summary.push({ key: 'lg.chg.ver', values: { v: d.reportVersion as string } });
        rows.push({ field: { key: 'lg.fld.report' }, old: null, new: { raw: d.reportVersion as string } });
      }
      break;
    case 'COMMENT_ADDED':
      if (d.event === 'updated') summary.push({ key: 'lgx.chg.cmUpd' });
      else if (d.event === 'deleted') summary.push({ key: 'lgx.chg.cmDel' });
      break;
  }

  const sameStatus = !!log.oldStatus && log.oldStatus === log.newStatus;
  if (log.oldStatus && log.newStatus && log.oldStatus !== log.newStatus) {
    rows.unshift({ field: { key: 'lg.fld.status' }, old: { status: log.oldStatus }, new: { status: log.newStatus } });
    summary.push({ key: 'lgx.chg.status', values: { o: { status: log.oldStatus }, n: { status: log.newStatus } } });
  } else if (!log.oldStatus && log.newStatus) {
    rows.unshift({ field: { key: 'lg.fld.status' }, old: null, new: { status: log.newStatus } });
    if (!summary.length) summary.push({ status: log.newStatus });
  }
  return { summary, rows, reasons, note, sameStatus };
}
