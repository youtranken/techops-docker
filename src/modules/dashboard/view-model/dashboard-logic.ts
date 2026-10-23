/**
 * A3-1 Tổng quan — hàm thuần: dữ liệu API V1 (`/api/dashboard/stats`, `/api/dashboard/performance`) → view model.
 * KHÔNG tính lại số liệu nghiệp vụ: chỉ chọn ô theo vai trò, gom %, định dạng như trang V1.
 */
import { APP_TIMEZONE } from '@/i18n/format';
import { dayDiffInZone } from '@/shared/ui/due';
import type { DashboardStats } from '../services/stats/types';

/** Thứ tự quy trình (preview `FLOW`) cho khối phân bố trạng thái. */
export const FLOW = ['DRAFT', 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'] as const;
export type FlowStatus = (typeof FLOW)[number];

/** Như V1 `page.tsx`: `['BOSS','ADMIN'].includes(role)`. */
export function isBossRole(role: string | null | undefined): boolean {
  return role === 'BOSS' || role === 'ADMIN';
}

/* ---------- KPI ---------- */
export type KpiKey = 'total' | 'done' | 'approval' | 'review' | 'myProg' | 'myAck' | 'overdue' | 'sla';
export type SlaTone = 'good' | 'warn' | 'bad' | 'none';
export interface Kpi {
  key: KpiKey;
  /** null = không có số (SLA "—") */
  value: number | null;
  /** Trạng thái để vẽ chấm màu (ô 3–4) */
  status?: FlowStatus;
  /** % hoàn thành (ô Hoàn thành) */
  rate?: number;
  /** Độ dài thanh 0–100 */
  bar?: number;
  bad?: boolean;
  tone?: SlaTone;
}

const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
};

/** Ngưỡng màu SLA của V1: ≥80 xanh, ≥60 cam, còn lại đỏ. */
function slaTone(v: number | null): SlaTone {
  if (v === null) return 'none';
  return v >= 80 ? 'good' : v >= 60 ? 'warn' : 'bad';
}

export function buildKpis(stats: DashboardStats, role: string | null | undefined): Kpi[] {
  const boss = isBossRole(role);
  const rate = num(stats.completionRate) ?? 0;
  const sla = stats.slaRate === '—' ? null : num(stats.slaRate);
  return [
    { key: 'total', value: stats.totalTasks },
    { key: 'done', value: stats.completedTasks, rate, bar: rate },
    boss
      ? { key: 'approval', value: stats.pendingApproval, status: 'PENDING_APPROVAL' }
      : { key: 'myProg', value: stats.myInProgress, status: 'IN_PROGRESS' },
    boss
      ? { key: 'review', value: stats.pendingReview, status: 'PENDING_REVIEW' }
      : { key: 'myAck', value: stats.myWaitingAck, status: 'WAITING_ACKNOWLEDGE' },
    { key: 'overdue', value: stats.overdueCount, bad: stats.overdueCount > 0 },
    { key: 'sla', value: sla, bar: sla === null ? undefined : sla, tone: slaTone(sla) },
  ];
}

/** Số việc đang chờ người xem (dòng chào) — dùng lại đúng số ở ô KPI 3 + 4. */
export function waitingCount(stats: DashboardStats, role: string | null | undefined): number {
  return isBossRole(role) ? stats.pendingApproval + stats.pendingReview : stats.myInProgress + stats.myWaitingAck;
}

/** Động từ hiện dưới mỗi việc trong "Cần bạn xử lý" (theo trạng thái việc, như preview `v1Verb`). */
export function actionVerbKey(status: string): string | null {
  switch (status) {
    case 'PENDING_APPROVAL': return 'act.approve';
    case 'PENDING_REVIEW': return 'act.review';
    case 'WAITING_ACKNOWLEDGE': return 'act.accept';
    case 'IN_PROGRESS': return 'act.report';
    default: return null;
  }
}

/* ---------- Phân bố tháng ---------- */
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export function statusDistribution(byStatus: Record<string, number>) {
  const rows = FLOW.map((status) => ({ status, count: byStatus[status] ?? 0 }));
  const total = rows.reduce((s, r) => s + r.count, 0);
  return { total, rows: rows.map((r) => ({ ...r, pct: pct(r.count, total) })) };
}

export interface PriorityRef { id: string; name: string; level: number }
export interface PriorityBar { id: string; name: string; color: string | null; level: number | null; count: number; width: number }

/** Ghép số đếm V1 (`tasksByPriority`, chỉ nhóm có việc) với danh sách mức (`/api/settings/priorities`). */
export function priorityBars(
  groups: DashboardStats['tasksByPriority'],
  priorities: PriorityRef[] | undefined,
): { total: number; rows: PriorityBar[] } {
  const byId = new Map(groups.map((g) => [g.priorityId, g]));
  const rows: Omit<PriorityBar, 'width'>[] = [];
  if (priorities) {
    for (const p of [...priorities].sort((a, b) => b.level - a.level)) {
      const g = byId.get(p.id);
      rows.push({ id: p.id, name: p.name, color: g?.color ?? null, level: p.level, count: g?.count ?? 0 });
      byId.delete(p.id);
    }
  }
  for (const g of byId.values()) rows.push({ id: g.priorityId, name: g.name, color: g.color, level: null, count: g.count });
  const max = Math.max(0, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  return { total, rows: rows.map((r) => ({ ...r, width: max ? Math.round((r.count / max) * 100) : 0 })) };
}

export function workflowSplit(w: DashboardStats['tasksByWorkflowMode']) {
  const direct = w.IMMEDIATE ?? 0;
  const approval = w.NEED_APPROVAL ?? 0;
  const total = direct + approval;
  return { total, direct, approval, directPct: pct(direct, total), approvalPct: pct(approval, total) };
}

/* ---------- Hiệu suất ---------- */
export interface PerfPoint { date: string; created: number; completed: number }

export function perfSummary(points: PerfPoint[]) {
  let created = 0, completed = 0, max = 0;
  for (const p of points) {
    created += p.created;
    completed += p.completed;
    max = Math.max(max, p.created, p.completed);
  }
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10;
  const top = Math.ceil(max / step) * step;
  return { created, completed, max, step, top, empty: max === 0 };
}

/* ---------- Chữ ---------- */
export function greetingKey(hour: number): 'db.hi.am' | 'db.hi.pm' | 'db.hi.eve' {
  return hour < 11 ? 'db.hi.am' : hour < 18 ? 'db.hi.pm' : 'db.hi.eve';
}

const hmFmt = new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const monthFmt = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, month: 'numeric' });
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, hour: 'numeric', hourCycle: 'h23' });

export type AgoInfo =
  | { key: 'ago.now' }
  | { key: 'ago.min' | 'ago.hour'; values: { n: number } }
  | { key: 'ago.yday'; values: { h: string } }
  | { key: 'date' };

/** Thời gian tương đối (khoá `ago.*`); xa hơn hôm qua → `date` (nơi gọi định dạng ngày). */
export function timeAgo(when: Date | string, now: Date, timeZone: string = APP_TIMEZONE): AgoInfo {
  const d = when instanceof Date ? when : new Date(when);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return { key: 'ago.now' };
  if (mins < 60) return { key: 'ago.min', values: { n: mins } };
  const days = dayDiffInZone(now, d, timeZone);
  if (days <= 0) return { key: 'ago.hour', values: { n: Math.floor(mins / 60) } };
  if (days === 1) return { key: 'ago.yday', values: { h: hmFmt.format(d) } };
  return { key: 'date' };
}

/** Nội dung bình luận thành 1 dòng: `@[Tên]` → `@Tên`, gộp khoảng trắng. */
export function commentPreview(text: string): string {
  return text.replace(/@\[([^\]]+)\]/g, '@$1').replace(/\s+/g, ' ').trim();
}

/** Tháng hiện tại (0–11) theo giờ app — nhãn "tháng {m}" của các khối phân bố. */
export function monthIndex(now: Date): number {
  return Number(monthFmt.format(now)) - 1;
}

/** Giờ hiện tại (0–23) theo giờ app — chọn câu chào. */
export function hourOf(now: Date): number {
  return Number(hourFmt.format(now)) % 24;
}

const wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' });
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Thứ trong tuần (0 = Chủ nhật) theo giờ app — chỉ số vào `db.wd`. */
export function weekdayIndex(now: Date): number {
  return WD.indexOf(wdFmt.format(now));
}

/** Chưa có công việc nào trong phạm vi người xem (tổng không tính hủy = 0 và không có việc gần đây). */
export function isDashboardEmpty(stats: DashboardStats): boolean {
  return stats.totalTasks === 0 && stats.recentTasks.length === 0;
}

/** "HH:mm" theo giờ app. */
export function clockOf(when: Date | string): string {
  return hmFmt.format(when instanceof Date ? when : new Date(when));
}
