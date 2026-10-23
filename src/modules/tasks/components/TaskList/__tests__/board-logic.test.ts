/**
 * TDD A2-4a — Bảng Kanban: ánh xạ "kéo cột A → cột B" = hành động V1 + truy vấn từng cột.
 *
 * Mốc đối chiếu V1 (không đoán):
 *  - Ai được làm gì: `useTaskPermissions` ← `taskActionMatrix.ts` (cùng nguồn với menu ⋯ / `quickMenuKeys`).
 *    Ở đây so với `v1CardMenu` (bản sao menu thẻ V1) để chắc kéo thả KHÔNG mở thêm quyền nào.
 *  - Việc đi sang cột nào: đọc từ service V1 —
 *      approval.service approvePlan:  PENDING_APPROVAL → WAITING_ACKNOWLEDGE
 *      acknowledge.service:           WAITING_ACKNOWLEDGE → IN_PROGRESS (IN_PROGRESS giữ nguyên)
 *      lifecycle.service complete:    IN_PROGRESS → PENDING_REVIEW nếu NEED_APPROVAL hoặc người làm đang REVISION_REQUIRED,
 *                                     ngược lại → COMPLETED (chỉ khi mọi người làm đã xong)
 *      approval.service approveReview: PENDING_REVIEW → COMPLETED
 */
import { describe, it, expect } from 'vitest';
import type { TaskStatus } from '@prisma/client';
import {
  BOARD_FLOW, columnOf, forwardMove, resolveViewMode, modeUpdate, dropActionFor, boardColumns, columnFilters, COL_LIMIT, nextColLimit,
  type BoardCol,
} from '../board-logic';
import { readListState, toApiFilters } from '../list-logic';
import { v1CardMenu } from './v1-list.fixture';
import { useTaskPermissions } from '../../../actions/hooks/useTaskPermissions';
import type { TaskListItem } from '../../../services/task-query.service';

const NOW = new Date('2026-10-23T03:00:00Z');
const ME = 'u-me';
const ROLES = ['ADMIN', 'BOSS', 'EMPLOYEE'] as const;
const STATUSES: TaskStatus[] = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'];
const MODES = ['NEED_APPROVAL', 'IMMEDIATE'] as const;
const ALL_COLS: BoardCol[] = [...BOARD_FLOW, 'CANCELLED'];

/** Quan hệ người xem ↔ việc */
type Rel =
  | 'creator' | 'creatorAndAssignee' | 'assigneePending' | 'assigneeInProgress' | 'assigneeRevision'
  | 'assigneeCompleted' | 'multiPendingOther' | 'other';
const RELS: Rel[] = [
  'creator', 'creatorAndAssignee', 'assigneePending', 'assigneeInProgress', 'assigneeRevision', 'assigneeCompleted', 'multiPendingOther', 'other',
];

function mkTask(status: TaskStatus, mode: string, rel: Rel, extra: Partial<TaskListItem> = {}): TaskListItem {
  const person = (id: string) => ({ id, displayName: id, username: id, profile: null });
  const asg = (id: string, st: string) => ({ id: `a-${id}`, status: st, user: person(id) });
  const assignees = {
    creator: [asg('u-x', 'IN_PROGRESS')],
    creatorAndAssignee: [asg(ME, 'IN_PROGRESS')],
    assigneePending: [asg(ME, 'PENDING')],
    assigneeInProgress: [asg(ME, 'IN_PROGRESS')],
    assigneeRevision: [asg(ME, 'REVISION_REQUIRED')],
    assigneeCompleted: [asg(ME, 'COMPLETED'), asg('u-y', 'IN_PROGRESS')],
    multiPendingOther: [asg(ME, 'IN_PROGRESS'), asg('u-y', 'PENDING')],
    other: [asg('u-x', 'IN_PROGRESS')],
  }[rel];
  return {
    id: 't1', taskCode: '26-0001', title: 'x', status, workflowMode: mode, isForceMode: false, allFailed: false,
    scheduleStart: NOW, scheduleEnd: NOW, createdAt: NOW,
    priority: { id: 'p', name: 'p', color: '#000', level: 2 }, type: { id: 't', name: 't', color: '#000', icon: 'x' },
    creator: person(rel === 'creator' || rel === 'creatorAndAssignee' ? ME : 'u-boss'),
    assignees, _count: { comments: 0 }, extensions: [],
    hdNguonNhap: null, hdCode: null, isImportant: false, isUnseen: false,
    ...extra,
  };
}

// ── Oracle độc lập: hành động V1 có trong menu thẻ V1 + cột đích theo service V1 ──
const V1_NEXT: Record<string, (t: TaskListItem, myAssigneeStatus?: string) => TaskStatus | null> = {
  'approve-plan': (t) => (t.status === 'PENDING_APPROVAL' ? 'WAITING_ACKNOWLEDGE' : null),
  acknowledge: (t) => (t.status === 'WAITING_ACKNOWLEDGE' ? 'IN_PROGRESS' : null), // IN_PROGRESS → giữ nguyên
  complete: (t, a) => (a === 'REVISION_REQUIRED' || t.workflowMode === 'NEED_APPROVAL' ? 'PENDING_REVIEW' : 'COMPLETED'),
  'approve-review': (t) => (t.status === 'PENDING_REVIEW' ? 'COMPLETED' : null),
};
function oracle(task: TaskListItem, role: string): { action: string; to: TaskStatus } | null {
  const p = useTaskPermissions(task, ME, role);
  const menu = v1CardMenu(p, task.extensions);
  const mine = task.assignees.find((a) => a.user.id === ME)?.status;
  const moves = menu
    .filter((k) => k in V1_NEXT)
    .map((k) => ({ action: k, to: V1_NEXT[k](task, mine) }))
    .filter((m): m is { action: string; to: TaskStatus } => !!m.to && m.to !== task.status);
  // Luật đã chốt: chỉ 1 bước tiến, mỗi thẻ tối đa 1 cột đích
  expect(moves.length).toBeLessThanOrEqual(1);
  const m = moves[0];
  if (!m) return null;
  // đúng 1 bước kế tiếp trên quy trình (Trực tiếp: Đang làm → Đã xong là bước kế tiếp vì không có Chờ nghiệm thu)
  return m;
}

describe('columnOf — trạng thái V1 → cột', () => {
  it('5 cột quy trình + Đã hủy; DRAFT không có cột (bỏ cột Nháp)', () => {
    expect(BOARD_FLOW).toEqual(['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']);
    for (const s of STATUSES) expect(columnOf(s)).toBe(s);
    expect(columnOf('DRAFT')).toBeNull();
    expect(columnOf('REVISION_REQUIRED')).toBeNull();
  });
});

describe('dropActionFor — ma trận đủ vai trò × trạng thái × 2 chế độ × quan hệ, đối chiếu quyền + service V1', () => {
  const cases: [string, TaskStatus, string, Rel][] = [];
  for (const role of ROLES) for (const s of STATUSES) for (const mode of MODES) for (const rel of RELS) cases.push([role, s, mode, rel]);

  it.each(cases)('%s · %s · %s · %s', (role, status, mode, rel) => {
    const task = mkTask(status, mode, rel);
    const p = useTaskPermissions(task, ME, role);
    const want = oracle(task, role);
    const from = columnOf(task.status)!;
    // forwardMove = đúng hành động + cột đích của V1
    const fm = forwardMove(task, p);
    expect(fm).toEqual(want ? { action: want.action, to: want.to } : null);
    // mọi cặp (từ, đến): chỉ đúng cặp (cột hiện tại → cột đích) cho ra hành động
    for (const a of ALL_COLS) {
      for (const b of ALL_COLS) {
        const got = dropActionFor(task, a, b, p);
        const ok = !!want && a === from && b === want.to;
        expect(got, `${a} → ${b}`).toBe(ok ? want!.action : null);
      }
    }
  });
});

describe('dropActionFor — các cặp chính (đọc được)', () => {
  const P = (t: TaskListItem, role: string) => useTaskPermissions(t, ME, role);
  it('Boss: Chờ duyệt → Chờ nhận việc = Duyệt', () => {
    const t = mkTask('PENDING_APPROVAL', 'NEED_APPROVAL', 'other');
    expect(dropActionFor(t, 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', P(t, 'BOSS'))).toBe('approve-plan');
    expect(dropActionFor(t, 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', P(t, 'ADMIN'))).toBe('approve-plan');
  });
  it('Nhân viên người tạo KHÔNG tự duyệt việc của mình', () => {
    const t = mkTask('PENDING_APPROVAL', 'NEED_APPROVAL', 'creatorAndAssignee');
    expect(dropActionFor(t, 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', P(t, 'EMPLOYEE'))).toBeNull();
  });
  it('Người làm (PENDING): Chờ nhận việc → Đang làm = Nhận việc; Boss không nhận hộ', () => {
    const t = mkTask('WAITING_ACKNOWLEDGE', 'IMMEDIATE', 'assigneePending');
    expect(dropActionFor(t, 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', P(t, 'EMPLOYEE'))).toBe('acknowledge');
    const o = mkTask('WAITING_ACKNOWLEDGE', 'IMMEDIATE', 'other');
    expect(dropActionFor(o, 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', P(o, 'BOSS'))).toBeNull();
  });
  it('Người làm: Đang làm → Chờ nghiệm thu (Phê duyệt) / → Đã xong (Trực tiếp) = Báo cáo hoàn thành', () => {
    const a = mkTask('IN_PROGRESS', 'NEED_APPROVAL', 'assigneeInProgress');
    expect(dropActionFor(a, 'IN_PROGRESS', 'PENDING_REVIEW', P(a, 'EMPLOYEE'))).toBe('complete');
    expect(dropActionFor(a, 'IN_PROGRESS', 'COMPLETED', P(a, 'EMPLOYEE'))).toBeNull();
    const d = mkTask('IN_PROGRESS', 'IMMEDIATE', 'assigneeInProgress');
    expect(dropActionFor(d, 'IN_PROGRESS', 'COMPLETED', P(d, 'EMPLOYEE'))).toBe('complete');
    expect(dropActionFor(d, 'IN_PROGRESS', 'PENDING_REVIEW', P(d, 'EMPLOYEE'))).toBeNull();
  });
  it('Người làm bị Yêu cầu làm lại (REVISION_REQUIRED): nộp lại → Chờ nghiệm thu', () => {
    const r = mkTask('IN_PROGRESS', 'NEED_APPROVAL', 'assigneeRevision');
    expect(forwardMove(r, P(r, 'EMPLOYEE'))).toEqual({ action: 'complete', to: 'PENDING_REVIEW' });
  });
  it('Boss/Admin: Chờ nghiệm thu → Đã xong = Nghiệm thu; nhân viên thì không', () => {
    const t = mkTask('PENDING_REVIEW', 'NEED_APPROVAL', 'other');
    expect(dropActionFor(t, 'PENDING_REVIEW', 'COMPLETED', P(t, 'BOSS'))).toBe('approve-review');
    expect(dropActionFor(t, 'PENDING_REVIEW', 'COMPLETED', P(t, 'ADMIN'))).toBe('approve-review');
    expect(dropActionFor(t, 'PENDING_REVIEW', 'COMPLETED', P(t, 'EMPLOYEE'))).toBeNull();
  });
  it('Không kéo lùi, không nhảy 2 bước, không thả vào Đã hủy, không thả tại chỗ', () => {
    const t = mkTask('PENDING_APPROVAL', 'NEED_APPROVAL', 'other');
    const p = P(t, 'ADMIN');
    expect(dropActionFor(t, 'PENDING_APPROVAL', 'IN_PROGRESS', p)).toBeNull();
    expect(dropActionFor(t, 'PENDING_APPROVAL', 'CANCELLED', p)).toBeNull();
    expect(dropActionFor(t, 'PENDING_APPROVAL', 'PENDING_APPROVAL', p)).toBeNull();
    const r = mkTask('PENDING_REVIEW', 'NEED_APPROVAL', 'other');
    expect(dropActionFor(r, 'PENDING_REVIEW', 'IN_PROGRESS', P(r, 'BOSS'))).toBeNull(); // = Yêu cầu làm lại → chỉ qua menu
  });
  it('Cột nguồn phải là cột hiện tại của thẻ', () => {
    const t = mkTask('PENDING_REVIEW', 'NEED_APPROVAL', 'other');
    expect(dropActionFor(t, 'IN_PROGRESS', 'COMPLETED', P(t, 'BOSS'))).toBeNull();
  });
  it('Người làm mới được chuyển giao (PENDING) khi việc đang làm: Nhận việc KHÔNG đổi cột → không kéo', () => {
    const t = mkTask('IN_PROGRESS', 'NEED_APPROVAL', 'assigneePending');
    const p = P(t, 'EMPLOYEE');
    expect(p.canAcknowledge).toBe(true);
    expect(forwardMove(t, p)).toBeNull();
  });
  it('Chế độ bắt buộc (isForceMode) không đổi luật kéo (chỉ khoá Từ chối/Chuyển giao như V1)', () => {
    const t = mkTask('WAITING_ACKNOWLEDGE', 'NEED_APPROVAL', 'assigneePending', { isForceMode: true });
    expect(forwardMove(t, P(t, 'EMPLOYEE'))).toEqual({ action: 'acknowledge', to: 'IN_PROGRESS' });
  });
});

// ───────────────────────────── Dữ liệu từng cột (API danh sách V1) ─────────────────────────────
const st = (q: string, role: string) => readListState((k) => new URLSearchParams(q).get(k), role === 'ADMIN' || role === 'BOSS');
const api = (q: string, role: string) => toApiFilters(st(q, role), NOW);
const TR = (role: string) => role === 'ADMIN' || role === 'BOSS';

describe('boardColumns — cột hiện theo tab/bộ lọc', () => {
  it('mặc định (Đang mở) và lọc 1 trạng thái đang mở: 5 cột quy trình', () => {
    expect(boardColumns(api('', 'EMPLOYEE'))).toEqual(BOARD_FLOW);
    expect(boardColumns(api('status=IN_PROGRESS', 'BOSS'))).toEqual(BOARD_FLOW);
  });
  it('Tất cả (status=all): thêm cột Đã hủy', () => {
    expect(boardColumns(api('status=all', 'BOSS'))).toEqual([...BOARD_FLOW, 'CANCELLED']);
  });
  it('tab Đã xong / Đã hủy: chỉ 1 cột', () => {
    expect(boardColumns(api('status=COMPLETED', 'EMPLOYEE'))).toEqual(['COMPLETED']);
    expect(boardColumns(api('status=CANCELLED', 'ADMIN'))).toEqual(['CANCELLED']);
  });
});

describe('columnFilters — mỗi cột = 1 lần gọi GET /api/tasks V1 với status của cột, giữ nguyên bộ lọc', () => {
  it('giữ mọi tham số V1, thay status + trang 1 + giới hạn cột', () => {
    const a = api('search=may&priorityId=p1&typeId=t1&source=helpdesk&datePreset=7d&sort=scheduleEnd:asc&page=3&limit=50', 'EMPLOYEE');
    expect(columnFilters(a, 'IN_PROGRESS', COL_LIMIT, TR('EMPLOYEE'))).toEqual({
      ...a, status: 'IN_PROGRESS', hideCompleted: undefined, page: 1, limit: COL_LIMIT,
    });
  });
  it('Đang mở — nhân viên: cột Đã xong / Đã hủy không tải (V1 ẩn việc đã xong/đã hủy)', () => {
    const a = api('', 'EMPLOYEE');
    expect(columnFilters(a, 'COMPLETED', COL_LIMIT, TR('EMPLOYEE'))).toBeNull();
    expect(columnFilters(a, 'CANCELLED', COL_LIMIT, TR('EMPLOYEE'))).toBeNull();
    for (const c of BOARD_FLOW.slice(0, 4)) expect(columnFilters(a, c, COL_LIMIT, TR('EMPLOYEE'))?.status).toBe(c);
  });
  it('Đang mở — Boss/Admin: cột Đã xong = việc Hoàn thành CHƯA XEM (giống danh sách V1)', () => {
    const a = api('', 'BOSS');
    expect(columnFilters(a, 'COMPLETED', COL_LIMIT, TR('BOSS'))).toMatchObject({ status: 'COMPLETED', unseenOnly: true, hideCompleted: undefined });
    expect(columnFilters(a, 'CANCELLED', COL_LIMIT, TR('BOSS'))).toBeNull();
  });
  it('Quan trọng (★): giữ important ở mọi cột', () => {
    const a = api('view=important', 'ADMIN');
    expect(columnFilters(a, 'IN_PROGRESS', COL_LIMIT, TR('ADMIN'))).toMatchObject({ status: 'IN_PROGRESS', important: true });
    expect(columnFilters(a, 'COMPLETED', COL_LIMIT, TR('ADMIN'))).toMatchObject({ status: 'COMPLETED', important: true, unseenOnly: true });
  });
  it('lọc 1 trạng thái: cột khác không tải (ngoài bộ lọc)', () => {
    const a = api('status=PENDING_REVIEW', 'BOSS');
    expect(columnFilters(a, 'PENDING_REVIEW', COL_LIMIT, TR('BOSS'))?.status).toBe('PENDING_REVIEW');
    expect(columnFilters(a, 'IN_PROGRESS', COL_LIMIT, TR('BOSS'))).toBeNull();
  });
  it('Tất cả: mọi cột tải đủ, kể cả Đã xong / Đã hủy', () => {
    const a = api('status=all', 'EMPLOYEE');
    for (const c of [...BOARD_FLOW, 'CANCELLED'] as BoardCol[]) expect(columnFilters(a, c, COL_LIMIT, TR('EMPLOYEE'))).toMatchObject({ status: c });
    expect(columnFilters(a, 'COMPLETED', COL_LIMIT, TR('EMPLOYEE'))?.unseenOnly).toBeUndefined();
  });
  it('Mới xong (Boss): giữ unseenOnly', () => {
    const a = api('view=unseen', 'BOSS');
    expect(columnFilters(a, 'COMPLETED', COL_LIMIT, TR('BOSS'))).toMatchObject({ status: 'COMPLETED', unseenOnly: true });
  });
});

describe('nextColLimit — "Xem thêm" tăng giới hạn cột, trần = MAX_PAGE_SIZE của API (100)', () => {
  it('20 → 40 → … → 100, không vượt 100', () => {
    expect(COL_LIMIT).toBe(20);
    expect(nextColLimit(20)).toBe(40);
    expect(nextColLimit(80)).toBe(100);
    expect(nextColLimit(100)).toBe(100);
  });
});

describe('chế độ xem Danh sách | Bảng — URL `mode` + nhớ lựa chọn (cookie)', () => {
  it('URL thắng; không có thì theo lựa chọn đã nhớ; giá trị lạ → Danh sách', () => {
    expect(resolveViewMode('board', 'list')).toBe('board');
    expect(resolveViewMode('list', 'board')).toBe('list');
    expect(resolveViewMode(null, 'board')).toBe('board');
    expect(resolveViewMode(null, undefined)).toBe('list');
    expect(resolveViewMode('xyz', 'board')).toBe('list');
    expect(resolveViewMode(null, 'rac')).toBe('list');
  });
  it('đổi chế độ: ghi mode rõ ràng (để thắng cookie cũ ở tab khác) và bỏ trang', () => {
    expect(modeUpdate('board')).toEqual({ mode: 'board', page: undefined });
    expect(modeUpdate('list')).toEqual({ mode: 'list', page: undefined });
  });
});
