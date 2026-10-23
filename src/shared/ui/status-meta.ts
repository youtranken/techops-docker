/**
 * NGUỒN DUY NHẤT cho nhãn + màu của trạng thái công việc, trạng thái người làm và mức ưu tiên.
 * Nhãn là KHOÁ messages (A1.3): `st.*`, `td.as.*`, `pr.*` — dịch bằng `metaLabel(meta, t)`.
 * Màu là token CSS (globals.css) nên tự đổi theo sáng/tối.
 */
import type { TaskStatus, AssigneeStatus } from '@prisma/client';
import type { Translate } from '@/i18n/locale';

export interface StatusMeta {
  /** Khoá messages của nhãn; null khi giá trị lạ (dùng `fallbackLabel`) */
  labelKey: string | null;
  /** Nhãn hiển thị khi không có khoá (giá trị enum lạ) */
  fallbackLabel?: string;
  /** Giá trị CSS (token), dùng làm màu chấm/chữ */
  color: string;
  /** Chấm rỗng (viền) thay cho chấm đặc */
  hollow?: boolean;
}

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  DRAFT:               { labelKey: 'st.DRAFT',               color: 'var(--c-draft)' },
  PENDING_APPROVAL:    { labelKey: 'st.PENDING_APPROVAL',    color: 'var(--c-approval)' },
  WAITING_ACKNOWLEDGE: { labelKey: 'st.WAITING_ACKNOWLEDGE', color: 'var(--c-pickup)' },
  IN_PROGRESS:         { labelKey: 'st.IN_PROGRESS',         color: 'var(--c-progress)' },
  PENDING_REVIEW:      { labelKey: 'st.PENDING_REVIEW',      color: 'var(--c-review)' },
  COMPLETED:           { labelKey: 'st.COMPLETED',           color: 'var(--c-done)' },
  CANCELLED:           { labelKey: 'st.CANCELLED',           color: 'var(--ink-3)' },
};

/** Trạng thái của từng người làm (enum V1 — _SPEC mục 8). */
export const ASSIGNEE_STATUS_META: Record<AssigneeStatus, StatusMeta> = {
  PENDING:           { labelKey: 'td.as.PENDING',           color: 'var(--ink-3)', hollow: true },
  ACKNOWLEDGED:      { labelKey: 'td.as.ACCEPTED',          color: 'var(--c-pickup)' },
  IN_PROGRESS:       { labelKey: 'td.as.IN_PROGRESS',       color: 'var(--c-progress)' },
  COMPLETED:         { labelKey: 'td.as.COMPLETED',         color: 'var(--c-done)' },
  REJECTED:          { labelKey: 'td.as.REJECTED',          color: 'var(--danger)' },
  TRANSFERRED:       { labelKey: 'td.as.TRANSFERRED',       color: 'var(--ink-3)', hollow: true },
  REVISION_REQUIRED: { labelKey: 'td.as.REVISION_REQUIRED', color: 'var(--c-review)' },
};

const fallback = (s: string): StatusMeta => ({ labelKey: null, fallbackLabel: s, color: 'var(--ink-3)' });

/** Nhãn hiển thị của meta theo ngôn ngữ hiện tại. */
export function metaLabel(meta: StatusMeta, t: Translate): string {
  return meta.labelKey ? t(meta.labelKey) : meta.fallbackLabel ?? '';
}

export function taskStatusMeta(status: TaskStatus | string): StatusMeta {
  return TASK_STATUS_META[status as TaskStatus] ?? fallback(status);
}

export function assigneeStatusMeta(status: AssigneeStatus | string): StatusMeta {
  return ASSIGNEE_STATUS_META[status as AssigneeStatus] ?? fallback(status);
}

/* ---------- Ưu tiên ---------- */
/** Mức ưu tiên lưu ở bảng `Priority` (tên + level do người dùng đặt). Tông màu suy từ level như PriorityBadge V1. */
export type PriorityTone = 'urgent' | 'high' | 'normal' | 'low';

export const PRIORITY_TONE_META: Record<PriorityTone, StatusMeta & { strong: boolean }> = {
  urgent: { labelKey: 'pr.urgent', color: 'var(--danger)',   strong: true },
  high:   { labelKey: 'pr.high',   color: 'var(--c-review)', strong: true },
  normal: { labelKey: 'pr.normal', color: 'var(--ink-3)',    strong: false },
  low:    { labelKey: 'pr.low',    color: 'var(--ink-3)',    strong: false },
};

export function priorityTone(level: number | null | undefined): PriorityTone {
  if (level === null || level === undefined || Number.isNaN(level)) return 'normal';
  if (level >= 4) return 'urgent';
  if (level === 3) return 'high';
  if (level === 2) return 'normal';
  return 'low';
}
