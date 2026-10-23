/**
 * NGUỒN DUY NHẤT cho nhãn + màu của trạng thái công việc, trạng thái người làm và mức ưu tiên.
 * Nhãn tạm bằng tiếng Việt như preview DS v2 (copy.js `st.*`, `td.as.*`, `pr.*`); sẽ chuyển sang
 * messages/*.json ở lát song ngữ (A1.3). Màu là token CSS (globals.css) nên tự đổi theo sáng/tối.
 */
import type { TaskStatus, AssigneeStatus } from '@prisma/client';

export interface StatusMeta {
  label: string;
  /** Giá trị CSS (token), dùng làm màu chấm/chữ */
  color: string;
  /** Chấm rỗng (viền) thay cho chấm đặc */
  hollow?: boolean;
}

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  DRAFT:               { label: 'Nháp',           color: 'var(--c-draft)' },
  PENDING_APPROVAL:    { label: 'Chờ duyệt',      color: 'var(--c-approval)' },
  WAITING_ACKNOWLEDGE: { label: 'Chờ nhận việc',  color: 'var(--c-pickup)' },
  IN_PROGRESS:         { label: 'Đang làm',       color: 'var(--c-progress)' },
  PENDING_REVIEW:      { label: 'Chờ nghiệm thu', color: 'var(--c-review)' },
  COMPLETED:           { label: 'Đã xong',        color: 'var(--c-done)' },
  CANCELLED:           { label: 'Đã hủy',         color: 'var(--ink-3)' },
};

/** Trạng thái của từng người làm (enum V1 — _SPEC mục 8). */
export const ASSIGNEE_STATUS_META: Record<AssigneeStatus, StatusMeta> = {
  PENDING:           { label: 'Chờ nhận',       color: 'var(--ink-3)', hollow: true },
  ACKNOWLEDGED:      { label: 'Đã nhận',        color: 'var(--c-pickup)' },
  IN_PROGRESS:       { label: 'Đang làm',       color: 'var(--c-progress)' },
  COMPLETED:         { label: 'Đã báo cáo',     color: 'var(--c-done)' },
  REJECTED:          { label: 'Từ chối',        color: 'var(--danger)' },
  TRANSFERRED:       { label: 'Đã chuyển giao', color: 'var(--ink-3)', hollow: true },
  REVISION_REQUIRED: { label: 'Cần làm lại',    color: 'var(--c-review)' },
};

const fallback = (s: string): StatusMeta => ({ label: s, color: 'var(--ink-3)' });

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
  urgent: { label: 'Khẩn',   color: 'var(--danger)',   strong: true },
  high:   { label: 'Cao',    color: 'var(--c-review)', strong: true },
  normal: { label: 'Thường', color: 'var(--ink-3)',    strong: false },
  low:    { label: 'Thấp',   color: 'var(--ink-3)',    strong: false },
};

export function priorityTone(level: number | null | undefined): PriorityTone {
  if (level === null || level === undefined || Number.isNaN(level)) return 'normal';
  if (level >= 4) return 'urgent';
  if (level === 3) return 'high';
  if (level === 2) return 'normal';
  return 'low';
}
