/**
 * Logic hiển thị của chi tiết công việc V2 (trang + ngăn xem nhanh). Hàm thuần, có test (`__tests__/detail-logic.test.ts`).
 * KHÔNG đặt luật nghiệp vụ mới: quyền lấy từ `useTaskPermissions` (V1), mốc thời gian lấy từ nhật ký (TaskAuditLog) V1.
 */
import type { TaskStatus } from '@prisma/client';
import { dayDiffInZone } from '@/shared/ui/due';

// ───────────────────────────── Kiểu đầu vào tối thiểu ─────────────────────────────
export interface LogLike {
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  createdAt: Date | string;
  details?: unknown;
  performedBy?: { id: string; displayName: string };
}
interface UserLike { id: string; displayName: string }
export interface AssigneeLike { id: string; status: string; user: UserLike }
export interface TaskLike {
  status: TaskStatus | string;
  workflowMode: string;
  createdAt: Date | string;
  completedAt?: Date | string | null;
  auditLogs: LogLike[];
  assignees: AssigneeLike[];
}

const toDate = (d: Date | string | null | undefined) => (d ? (d instanceof Date ? d : new Date(d)) : null);
const OPEN = new Set(['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW']);
const INACTIVE = new Set(['REJECTED', 'TRANSFERRED']);
const CANCEL_ACTIONS = new Set(['TASK_CANCELLED', 'PLAN_REJECTED']);

/** Nhật ký mới → cũ (API trả desc, nhưng không dựa vào thứ tự đó). */
function logsDesc(t: Pick<TaskLike, 'auditLogs'>) {
  return [...t.auditLogs].sort((a, b) => toDate(b.createdAt)!.getTime() - toDate(a.createdAt)!.getTime());
}

/** Lần gần nhất việc VÀO trạng thái `s` (log có newStatus = s và đổi trạng thái, hoặc log tạo việc). */
export function statusEnteredAt(t: Pick<TaskLike, 'auditLogs'>, s: string): Date | null {
  const hit = logsDesc(t).find((l) => l.newStatus === s && (l.oldStatus !== l.newStatus || l.action === 'TASK_CREATED'));
  return hit ? toDate(hit.createdAt) : null;
}

// ───────────────────────────── Hành trình ─────────────────────────────
const STEPS_APPROVAL: TaskStatus[] = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'];
/** Trực tiếp (service V1): tạo → Chờ nhận việc (hoặc thẳng Đang làm khi tự giao), báo cáo đủ → Đã xong (bỏ nghiệm thu). */
const STEPS_DIRECT: TaskStatus[] = ['WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'COMPLETED'];

export function journeySteps(workflowMode: string): TaskStatus[] {
  return [...(workflowMode === 'IMMEDIATE' ? STEPS_DIRECT : STEPS_APPROVAL)];
}

export type StepState = 'done' | 'cur' | 'todo';
export interface JourneyStep { key: TaskStatus; state: StepState; fin: boolean; stop: boolean; at: Date | null }
export interface Journey { steps: JourneyStep[]; cur: number; n: number }

export interface CancelInfo { base: TaskStatus; plan: boolean; at: Date | null; reason: string | null; byName: string | null }

export function cancelInfo(t: Pick<TaskLike, 'status' | 'auditLogs'>): CancelInfo | null {
  if (t.status !== 'CANCELLED') return null;
  const l = logsDesc(t).find((x) => x.newStatus === 'CANCELLED' && CANCEL_ACTIONS.has(x.action))
    ?? logsDesc(t).find((x) => x.newStatus === 'CANCELLED');
  const plan = l?.action === 'PLAN_REJECTED';
  const reason = (l?.details as { reason?: unknown } | null | undefined)?.reason;
  return {
    base: ((l?.oldStatus && l.oldStatus !== 'CANCELLED' ? l.oldStatus : plan ? 'PENDING_APPROVAL' : 'IN_PROGRESS') as TaskStatus),
    plan,
    at: l ? toDate(l.createdAt) : null,
    reason: typeof reason === 'string' && reason.trim() ? reason : null,
    byName: l?.performedBy?.displayName ?? null,
  };
}

export function buildJourney(t: Pick<TaskLike, 'status' | 'workflowMode' | 'auditLogs'>): Journey {
  const cx = cancelInfo(t);
  const at = (cx ? cx.base : t.status) as TaskStatus;
  const keys = journeySteps(t.workflowMode);
  if (!keys.includes(at)) keys.splice(Math.max(keys.length - 1, 0), 0, at);
  const cur = keys.indexOf(at);
  const steps = keys.map<JourneyStep>((key, i) => {
    const state: StepState = i < cur ? 'done' : i === cur ? 'cur' : 'todo';
    let date = i <= cur ? statusEnteredAt(t, key) : null;
    if (cx && i === cur) date = cx.at;
    return { key, state, fin: i === cur && key === 'COMPLETED', stop: !!cx && i === cur, at: date };
  });
  return { steps, cur, n: keys.length };
}

// ───────────────────────────── Đang ở chỗ ai ─────────────────────────────
export type Holder =
  | { kind: 'allFailed' }
  | { kind: 'closed'; at: Date | null }
  | { kind: 'cancelled'; at: Date | null }
  | { kind: 'approver'; you: boolean; since: number | null }
  | { kind: 'people'; people: AssigneeLike['user'][]; you: boolean; since: number | null }
  | { kind: 'none' };

export interface HolderOptions { viewerId: string; viewerRole: string; now: Date; allFailed: boolean }

export function taskHolder(t: TaskLike, o: HolderOptions): Holder {
  if (t.status === 'COMPLETED') return { kind: 'closed', at: toDate(t.completedAt) ?? statusEnteredAt(t, 'COMPLETED') };
  if (t.status === 'CANCELLED') return { kind: 'cancelled', at: cancelInfo(t)?.at ?? null };
  if (o.allFailed && OPEN.has(t.status)) return { kind: 'allFailed' };
  const entered = statusEnteredAt(t, t.status) ?? toDate(t.createdAt);
  const since = entered ? Math.max(0, dayDiffInZone(o.now, entered)) : null;
  if (t.status === 'PENDING_APPROVAL' || t.status === 'PENDING_REVIEW') {
    return { kind: 'approver', you: o.viewerRole === 'BOSS' || o.viewerRole === 'ADMIN', since };
  }
  const want = (s: string) => (t.status === 'WAITING_ACKNOWLEDGE' ? s === 'PENDING' : !INACTIVE.has(s) && s !== 'COMPLETED');
  const ppl = t.assignees.filter((a) => want(a.status)).map((a) => a.user);
  if (!ppl.length) return { kind: 'none' };
  const me = ppl.findIndex((p) => p.id === o.viewerId);
  if (me > 0) ppl.unshift(...ppl.splice(me, 1));
  return { kind: 'people', people: ppl, you: me > -1, since };
}

// ───────────────────────────── Hành động của người xem ─────────────────────────────
/** Các cờ quyền V1 dùng ở chi tiết (tập con của `TaskPermissions`). */
export interface DetailPermissions {
  canEdit: boolean; canCancel: boolean; canRestore: boolean; canAcknowledge: boolean; canComplete: boolean;
  canTransfer: boolean; canRejectTask: boolean; canApprovePlan: boolean; canRejectPlan: boolean;
  canApproveReview: boolean; canRejectReview: boolean; canRequestExtension: boolean; canReassign: boolean;
  canSupplementReport: boolean; allFailed: boolean;
}

/** Khoá trùng `ActionModalType` của V1 → mở đúng hộp thoại V1. */
export type DetailActionKey =
  | 'reassign' | 'restore' | 'approve-plan' | 'reject-plan' | 'approve-review' | 'reject-review'
  | 'acknowledge' | 'reject-task' | 'complete' | 'supplement' | 'transfer' | 'extension' | 'cancel';

export function detailActions(p: DetailPermissions): { main: DetailActionKey[]; more: DetailActionKey[] } {
  const main: DetailActionKey[] = [];
  const more: DetailActionKey[] = [];
  if (p.canReassign && p.allFailed) main.push('reassign'); // TaskActionButtons V1: canReassign && allFailed
  if (p.canRestore) main.push('restore');
  if (p.canApprovePlan) main.push('approve-plan');
  if (p.canRejectPlan) main.push('reject-plan');
  if (p.canApproveReview) main.push('approve-review');
  if (p.canRejectReview) main.push('reject-review');
  if (p.canAcknowledge) main.push('acknowledge');
  if (p.canRejectTask) main.push('reject-task');
  if (p.canComplete) main.push('complete');
  if (p.canSupplementReport) main.push('supplement');
  if (p.canTransfer) more.push('transfer');
  if (p.canRequestExtension) more.push('extension');
  if (p.canCancel) more.push('cancel');
  return { main, more };
}

const TURN_KEY: Partial<Record<DetailActionKey, string>> = {
  reassign: 'td.turn.reassign', restore: 'td.turn.restore',
  'approve-plan': 'td.turn.approve', 'reject-plan': 'td.turn.approve',
  'approve-review': 'td.turn.review', 'reject-review': 'td.turn.review',
  acknowledge: 'td.turn.accept', 'reject-task': 'td.turn.accept',
  complete: 'td.turn.report', supplement: 'td.turn.supplement',
};

/** "Đến lượt bạn …": chỉ khi người xem có nút chính (theo quyền V1). */
export function viewerTurn(p: DetailPermissions): { mine: boolean; key: string | null; showDays: boolean } {
  const first = detailActions(p).main[0];
  if (!first) return { mine: false, key: null, showDays: false };
  return { mine: true, key: TURN_KEY[first] ?? 'td.yourTurn', showDays: first !== 'supplement' && first !== 'restore' };
}

// ───────────────────────────── ‹ › trong ngăn ─────────────────────────────
export function drawerNav(ids: string[] | undefined, currentId: string) {
  if (!ids) return { i: -1, n: 0, prevId: null, nextId: null };
  const i = ids.indexOf(currentId);
  return {
    i,
    n: ids.length,
    prevId: i > 0 ? ids[i - 1] : null,
    nextId: i > -1 && i < ids.length - 1 ? ids[i + 1] : null,
  };
}

// ───────────────────────────── Kết quả người làm ─────────────────────────────
export type AssigneeNote =
  | { kind: 'declined'; text: string }
  | { kind: 'rework'; text: string }
  | { kind: 'to'; name: string }
  | { kind: 'from'; name: string }
  | { kind: 'byCancel' }
  | null;

type D = Record<string, unknown>;
export function assigneeNote(t: TaskLike, a: AssigneeLike): AssigneeNote {
  const logs = logsDesc(t);
  const by = (l: LogLike) => l.performedBy?.id === a.user.id;
  if (a.status === 'REJECTED') {
    const l = logs.find((x) => x.action === 'REJECTED' && by(x));
    const r = (l?.details as D | undefined)?.reason;
    if (l) return typeof r === 'string' && r ? { kind: 'declined', text: r } : null;
    return t.status === 'CANCELLED' ? { kind: 'byCancel' } : null;
  }
  if (a.status === 'REVISION_REQUIRED') {
    for (const l of logs.filter((x) => x.action === 'REVIEW_REJECTED')) {
      const e = ((l.details as D | undefined)?.entries as { assigneeId?: string; reason?: string }[] | undefined)
        ?.find((x) => x.assigneeId === a.id || !x.assigneeId);
      if (e?.reason) return { kind: 'rework', text: e.reason };
    }
    return null;
  }
  if (a.status === 'TRANSFERRED') {
    const l = logs.find((x) => x.action === 'TRANSFERRED' && by(x) && !(x.details as D | undefined)?.isRestore);
    const name = (l?.details as D | undefined)?.transferToName;
    return typeof name === 'string' ? { kind: 'to', name } : null;
  }
  const l = logs.find((x) => x.action === 'TRANSFERRED' && (x.details as D | undefined)?.transferTo === a.user.id && !(x.details as D).isRestore);
  return l?.performedBy ? { kind: 'from', name: l.performedBy.displayName } : null;
}

export function reportProgress(t: Pick<TaskLike, 'assignees'>) {
  const active = t.assignees.filter((a) => !INACTIVE.has(a.status));
  return { x: active.filter((a) => a.status === 'COMPLETED').length, n: active.length };
}
