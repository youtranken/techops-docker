import { describe, it, expect } from 'vitest';
import type { TaskStatus } from '@prisma/client';
import {
  journeySteps, buildJourney, cancelInfo, taskHolder, detailActions, viewerTurn, drawerNav, assigneeNote, reportProgress,
  type DetailPermissions,
} from '../detail-logic';
import { getStepState, getTimelineData } from './v1-workflowTimeline.fixture';

const D = (s: string) => new Date(s);
type Log = { action: string; oldStatus: string | null; newStatus: string | null; createdAt: Date; details?: unknown; performedBy?: { id: string; displayName: string } };
const log = (action: string, oldStatus: string | null, newStatus: string | null, at: string, extra: Partial<Log> = {}): Log =>
  ({ action, oldStatus, newStatus, createdAt: D(at), ...extra });

const base = (status: TaskStatus, workflowMode = 'NEED_APPROVAL', auditLogs: Log[] = []) => ({
  status, workflowMode, createdAt: D('2026-10-01T02:00:00Z'), completedAt: null as Date | null, auditLogs, assignees: [] as never[],
});

// ───────────────────────────── Hành trình ─────────────────────────────
describe('journeySteps', () => {
  it('Phê duyệt: 5 bước giống WorkflowTimeline V1', () => {
    expect(journeySteps('NEED_APPROVAL')).toEqual(getTimelineData('NEED_APPROVAL', 'IN_PROGRESS').steps.map((s) => s.key));
  });
  it('Trực tiếp: bỏ Chờ duyệt + Chờ nghiệm thu (luồng service V1: tạo → Chờ nhận việc, báo cáo xong → Đã xong)', () => {
    expect(journeySteps('IMMEDIATE')).toEqual(['WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'COMPLETED']);
  });
});

describe('buildJourney — trạng thái bước', () => {
  const MAP = { done: 'done', active: 'cur', pending: 'todo' } as const;
  const APPROVAL: TaskStatus[] = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'];
  it.each(APPROVAL)('Phê duyệt · %s: khớp getStepState của V1', (status) => {
    const j = buildJourney(base(status));
    const { steps, order } = getTimelineData('NEED_APPROVAL', status);
    expect(j.steps.map((s) => s.state)).toEqual(steps.map((s) => MAP[getStepState(s.key, status, order)]));
    expect(j.cur).toBe(APPROVAL.indexOf(status));
    expect(j.n).toBe(5);
  });

  it('Trực tiếp · Đang làm: bước 2/3, Chờ nhận việc đã qua', () => {
    const j = buildJourney(base('IN_PROGRESS', 'IMMEDIATE'));
    expect(j.steps.map((s) => [s.key, s.state])).toEqual([
      ['WAITING_ACKNOWLEDGE', 'done'], ['IN_PROGRESS', 'cur'], ['COMPLETED', 'todo'],
    ]);
  });

  it('Đã xong: bước cuối là cur + fin', () => {
    const j = buildJourney(base('COMPLETED', 'IMMEDIATE'));
    expect(j.steps[2]).toMatchObject({ key: 'COMPLETED', state: 'cur', fin: true });
  });

  it('Trực tiếp nhưng đang Chờ nghiệm thu (dữ liệu đổi chế độ): chèn bước đó trước Đã xong, không mất vị trí', () => {
    const j = buildJourney(base('PENDING_REVIEW', 'IMMEDIATE'));
    expect(j.steps.map((s) => s.key)).toEqual(['WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED']);
    expect(j.steps[2].state).toBe('cur');
  });

  it('Đã hủy: dừng ở bước trước khi hủy (oldStatus của log hủy), bước đó stop', () => {
    const j = buildJourney(base('CANCELLED', 'NEED_APPROVAL', [
      log('TASK_CANCELLED', 'IN_PROGRESS', 'CANCELLED', '2026-10-05T03:00:00Z'),
      log('ACKNOWLEDGED', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', '2026-10-03T03:00:00Z'),
    ]));
    expect(j.cur).toBe(2);
    expect(j.steps[2]).toMatchObject({ key: 'IN_PROGRESS', state: 'cur', stop: true });
    expect(j.steps[2].at).toEqual(D('2026-10-05T03:00:00Z')); // ngày hủy
  });

  it('Từ chối kế hoạch (PLAN_REJECTED) → dừng ở Chờ duyệt', () => {
    const j = buildJourney(base('CANCELLED', 'NEED_APPROVAL', [log('PLAN_REJECTED', 'PENDING_APPROVAL', 'CANCELLED', '2026-10-02T03:00:00Z')]));
    expect(j.cur).toBe(0);
    expect(j.steps[0].stop).toBe(true);
  });
});

describe('buildJourney — ngày của từng bước', () => {
  it('ngày = lần gần nhất việc VÀO bước đó; bước đầu lấy log tạo; bước chưa tới không có ngày', () => {
    const j = buildJourney(base('IN_PROGRESS', 'NEED_APPROVAL', [
      log('REVIEW_REJECTED', 'PENDING_REVIEW', 'IN_PROGRESS', '2026-10-09T03:00:00Z'),
      log('COMPLETED', 'IN_PROGRESS', 'PENDING_REVIEW', '2026-10-08T03:00:00Z'),
      log('ACKNOWLEDGED', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', '2026-10-04T03:00:00Z'),
      log('PLAN_APPROVED', 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', '2026-10-03T03:00:00Z'),
      log('TASK_CREATED', null, 'PENDING_APPROVAL', '2026-10-01T02:00:00Z'),
    ]));
    expect(j.steps.map((s) => s.at?.toISOString() ?? null)).toEqual([
      '2026-10-01T02:00:00.000Z', '2026-10-03T03:00:00.000Z', '2026-10-09T03:00:00.000Z', null, null,
    ]);
  });
  it('log cập nhật giữ nguyên trạng thái (old = new) không tính là "vào bước"', () => {
    const j = buildJourney(base('IN_PROGRESS', 'IMMEDIATE', [
      log('TASK_UPDATED', 'IN_PROGRESS', 'IN_PROGRESS', '2026-10-07T03:00:00Z'),
      log('ACKNOWLEDGED', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', '2026-10-04T03:00:00Z'),
    ]));
    expect(j.steps[1].at).toEqual(D('2026-10-04T03:00:00Z'));
  });
  it('bước bị bỏ qua (Boss tạo việc Phê duyệt → vào thẳng Chờ nhận việc): done, không có ngày', () => {
    const j = buildJourney(base('WAITING_ACKNOWLEDGE', 'NEED_APPROVAL', [log('TASK_CREATED', null, 'WAITING_ACKNOWLEDGE', '2026-10-01T02:00:00Z')]));
    expect(j.steps[0]).toMatchObject({ state: 'done', at: null });
    expect(j.steps[1].at).toEqual(D('2026-10-01T02:00:00Z'));
  });
});

describe('cancelInfo', () => {
  it('lấy lý do + người + lúc hủy từ log hủy gần nhất; null nếu việc chưa hủy', () => {
    expect(cancelInfo(base('IN_PROGRESS'))).toBeNull();
    const c = cancelInfo(base('CANCELLED', 'NEED_APPROVAL', [
      log('TASK_CANCELLED', 'IN_PROGRESS', 'CANCELLED', '2026-10-05T03:00:00Z', { details: { reason: 'Hết ngân sách' }, performedBy: { id: 'b', displayName: 'Boss' } }),
    ]));
    expect(c).toEqual({ base: 'IN_PROGRESS', plan: false, at: D('2026-10-05T03:00:00Z'), reason: 'Hết ngân sách', byName: 'Boss' });
  });
});

// ───────────────────────────── Đang ở chỗ ai ─────────────────────────────
const user = (id: string, displayName = id) => ({ id, displayName, username: id, profile: null });
const asg = (id: string, status: string) => ({ id: `a-${id}`, status, completedAt: null, reports: [], user: user(id) });
const NOW = D('2026-10-10T05:00:00Z'); // 12:00 giờ VN

describe('taskHolder', () => {
  const opt = (viewerId: string, viewerRole = 'EMPLOYEE', allFailed = false) => ({ viewerId, viewerRole, now: NOW, allFailed });

  it('Chờ nhận việc: những người còn PENDING; số ngày tính từ lúc vào trạng thái', () => {
    const t = { ...base('WAITING_ACKNOWLEDGE', 'IMMEDIATE', [log('TASK_CREATED', null, 'WAITING_ACKNOWLEDGE', '2026-10-08T02:00:00Z')]),
      assignees: [asg('u1', 'PENDING'), asg('u2', 'IN_PROGRESS'), asg('u3', 'PENDING'), asg('u4', 'REJECTED')] };
    const h = taskHolder(t, opt('boss', 'BOSS'));
    expect(h).toMatchObject({ kind: 'people', you: false, since: 2 });
    expect(h.kind === 'people' && h.people.map((p) => p.id)).toEqual(['u1', 'u3']);
  });

  it('Đang làm: người còn hiệu lực chưa báo cáo; người xem nằm trong danh sách → đứng đầu, you=true', () => {
    const t = { ...base('IN_PROGRESS', 'NEED_APPROVAL', [log('ACKNOWLEDGED', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', '2026-10-10T01:00:00Z')]),
      assignees: [asg('u1', 'IN_PROGRESS'), asg('u2', 'COMPLETED'), asg('u3', 'REVISION_REQUIRED'), asg('u5', 'TRANSFERRED')] };
    const h = taskHolder(t, opt('u3'));
    expect(h).toMatchObject({ kind: 'people', you: true, since: 0 });
    expect(h.kind === 'people' && h.people.map((p) => p.id)).toEqual(['u3', 'u1']);
  });

  it('Chờ duyệt / Chờ nghiệm thu: Boss/Admin xem → ở chỗ bạn; nhân viên xem → câu chờ chung', () => {
    const t = base('PENDING_REVIEW', 'NEED_APPROVAL', [log('COMPLETED', 'IN_PROGRESS', 'PENDING_REVIEW', '2026-10-07T03:00:00Z')]);
    expect(taskHolder(t, opt('boss', 'BOSS'))).toEqual({ kind: 'approver', you: true, since: 3 });
    expect(taskHolder(t, opt('admin', 'ADMIN'))).toEqual({ kind: 'approver', you: true, since: 3 });
    expect(taskHolder(t, opt('u1'))).toEqual({ kind: 'approver', you: false, since: 3 });
  });

  it('không có log vào trạng thái → tính từ ngày tạo', () => {
    const h = taskHolder({ ...base('IN_PROGRESS', 'IMMEDIATE'), assignees: [asg('u1', 'IN_PROGRESS')] }, opt('x'));
    expect(h).toMatchObject({ since: 9 });
  });

  it('Đã xong → closed (ngày hoàn thành); Đã hủy → cancelled (ngày hủy)', () => {
    expect(taskHolder({ ...base('COMPLETED'), completedAt: D('2026-10-09T03:00:00Z') }, opt('x'))).toEqual({ kind: 'closed', at: D('2026-10-09T03:00:00Z') });
    expect(taskHolder(base('CANCELLED', 'NEED_APPROVAL', [log('TASK_CANCELLED', 'IN_PROGRESS', 'CANCELLED', '2026-10-05T03:00:00Z')]), opt('x')))
      .toEqual({ kind: 'cancelled', at: D('2026-10-05T03:00:00Z') });
  });

  it('mọi người đã từ chối/chuyển đi (allFailed của quyền V1) khi việc còn mở → allFailed', () => {
    const t = { ...base('WAITING_ACKNOWLEDGE'), assignees: [asg('u1', 'REJECTED')] };
    expect(taskHolder(t, opt('x', 'EMPLOYEE', true))).toEqual({ kind: 'allFailed' });
    expect(taskHolder({ ...t, status: 'CANCELLED' as TaskStatus }, opt('x', 'EMPLOYEE', true)).kind).toBe('cancelled');
  });
});

// ───────────────────────────── Lượt của người xem ─────────────────────────────
const P = (over: Partial<DetailPermissions> = {}): DetailPermissions => ({
  canEdit: false, canCancel: false, canRestore: false, canAcknowledge: false, canComplete: false, canTransfer: false,
  canRejectTask: false, canApprovePlan: false, canRejectPlan: false, canApproveReview: false, canRejectReview: false,
  canRequestExtension: false, canReassign: false, canSupplementReport: false, allFailed: false, ...over,
});

describe('detailActions — chỉ đọc cờ quyền V1 (useTaskPermissions), không tự đặt luật', () => {
  it('không có quyền gì → không nút', () => {
    expect(detailActions(P())).toEqual({ main: [], more: [] });
  });
  it('Boss ở Chờ duyệt: [Duyệt, Từ chối] là nút chính', () => {
    expect(detailActions(P({ canApprovePlan: true, canRejectPlan: true, canEdit: true }))).toEqual({ main: ['approve-plan', 'reject-plan'], more: [] });
  });
  it('Người làm Đang làm: Báo cáo xong là chính; Chuyển giao/Xin gia hạn/Hủy vào ⋯', () => {
    expect(detailActions(P({ canComplete: true, canTransfer: true, canRequestExtension: true, canCancel: true })))
      .toEqual({ main: ['complete'], more: ['transfer', 'extension', 'cancel'] });
  });
  it('Giao lại chỉ khi canReassign VÀ allFailed (như TaskActionButtons V1)', () => {
    expect(detailActions(P({ canReassign: true })).main).toEqual([]);
    expect(detailActions(P({ canReassign: true, allFailed: true })).main).toEqual(['reassign']);
  });
  it('thứ tự nút chính theo preview', () => {
    const all = detailActions(P({
      canReassign: true, allFailed: true, canRestore: true, canApprovePlan: true, canRejectPlan: true, canApproveReview: true,
      canRejectReview: true, canAcknowledge: true, canRejectTask: true, canComplete: true, canSupplementReport: true,
    }));
    expect(all.main).toEqual(['reassign', 'restore', 'approve-plan', 'reject-plan', 'approve-review', 'reject-review',
      'acknowledge', 'reject-task', 'complete', 'supplement']);
  });
});

describe('viewerTurn', () => {
  it('không có nút chính → không phải lượt người xem', () => {
    expect(viewerTurn(P({ canCancel: true, canEdit: true }))).toEqual({ mine: false, key: null, showDays: false });
  });
  it.each([
    [{ canApprovePlan: true, canRejectPlan: true }, 'td.turn.approve', true],
    [{ canApproveReview: true, canRejectReview: true }, 'td.turn.review', true],
    [{ canRejectReview: true }, 'td.turn.review', true],
    [{ canAcknowledge: true, canRejectTask: true }, 'td.turn.accept', true],
    [{ canComplete: true }, 'td.turn.report', true],
    [{ canSupplementReport: true }, 'td.turn.supplement', false],
    [{ canRestore: true }, 'td.turn.restore', false],
    [{ canReassign: true, allFailed: true }, 'td.turn.reassign', true],
  ] as const)('%o → %s', (over, key, showDays) => {
    expect(viewerTurn(P(over))).toEqual({ mine: true, key, showDays });
  });
});

// ───────────────────────────── ‹ › trong ngăn ─────────────────────────────
describe('drawerNav', () => {
  const ids = ['a', 'b', 'c'];
  it('giữa danh sách: có cả trước và sau', () => {
    expect(drawerNav(ids, 'b')).toEqual({ i: 1, n: 3, prevId: 'a', nextId: 'c' });
  });
  it('đầu danh sách: không có trước', () => {
    expect(drawerNav(ids, 'a')).toEqual({ i: 0, n: 3, prevId: null, nextId: 'b' });
  });
  it('cuối danh sách: không có sau', () => {
    expect(drawerNav(ids, 'c')).toEqual({ i: 2, n: 3, prevId: 'b', nextId: null });
  });
  it('nơi mở không truyền danh sách → ẩn ‹ ›', () => {
    expect(drawerNav(undefined, 'a')).toEqual({ i: -1, n: 0, prevId: null, nextId: null });
  });
  it('việc không còn trong danh sách (vd đã lọc mất) → không có vị trí, không chuyển', () => {
    expect(drawerNav(ids, 'z')).toEqual({ i: -1, n: 3, prevId: null, nextId: null });
  });
});

// ───────────────────────────── Kết quả người làm ─────────────────────────────
describe('assigneeNote + reportProgress', () => {
  const logs: Log[] = [
    log('REVIEW_REJECTED', 'PENDING_REVIEW', 'IN_PROGRESS', '2026-10-06T03:00:00Z', { details: { entries: [{ assigneeId: 'a-u3', reason: 'Thiếu ảnh' }] }, performedBy: { id: 'boss', displayName: 'Boss' } }),
    log('REJECTED', 'WAITING_ACKNOWLEDGE', 'WAITING_ACKNOWLEDGE', '2026-10-05T03:00:00Z', { details: { reason: 'Đang nghỉ phép' }, performedBy: { id: 'u4', displayName: 'U4' } }),
    log('TRANSFERRED', 'IN_PROGRESS', 'IN_PROGRESS', '2026-10-04T03:00:00Z', { details: { transferTo: 'u6', transferToName: 'U6' }, performedBy: { id: 'u5', displayName: 'U5' } }),
  ];
  const t = { ...base('IN_PROGRESS', 'NEED_APPROVAL', logs),
    assignees: [asg('u1', 'COMPLETED'), asg('u3', 'REVISION_REQUIRED'), asg('u4', 'REJECTED'), asg('u5', 'TRANSFERRED'), asg('u6', 'IN_PROGRESS')] };
  it('lý do từ chối / làm lại / chuyển cho ai / nhận chuyển từ ai — lấy từ nhật ký V1', () => {
    expect(assigneeNote(t, t.assignees[1])).toEqual({ kind: 'rework', text: 'Thiếu ảnh' });
    expect(assigneeNote(t, t.assignees[2])).toEqual({ kind: 'declined', text: 'Đang nghỉ phép' });
    expect(assigneeNote(t, t.assignees[3])).toEqual({ kind: 'to', name: 'U6' });
    expect(assigneeNote(t, t.assignees[4])).toEqual({ kind: 'from', name: 'U5' });
    expect(assigneeNote(t, t.assignees[0])).toBeNull();
  });
  it('bị từ chối do việc bị hủy (không có log từ chối của chính người đó)', () => {
    const c = { ...t, status: 'CANCELLED' as TaskStatus, auditLogs: [log('TASK_CANCELLED', 'IN_PROGRESS', 'CANCELLED', '2026-10-07T03:00:00Z')] };
    expect(assigneeNote(c, asg('u1', 'REJECTED'))).toEqual({ kind: 'byCancel' });
  });
  it('x/n đã báo cáo: n = người còn hiệu lực (không tính REJECTED/TRANSFERRED)', () => {
    expect(reportProgress(t)).toEqual({ x: 1, n: 3 });
  });
});
