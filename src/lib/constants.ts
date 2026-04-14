/**
 * Shared display constants — single source of truth.
 * Import từ đây thay vì định nghĩa lại ở mỗi file.
 */
import type { TaskStatus, WorkflowMode } from '@prisma/client';

// ─── Role ─────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  BOSS: 'Quản lý',
  EMPLOYEE: 'Nhân viên',
};

export const ROLE_BADGE_VARIANTS: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'destructive',
  BOSS: 'default',
  EMPLOYEE: 'secondary',
};

// ─── Task Status ──────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<TaskStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Chờ duyệt',
  WAITING_ACKNOWLEDGE: 'Chờ tiếp nhận',
  IN_PROGRESS: 'Đang thực hiện',
  PENDING_REVIEW: 'Chờ Review',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const STATUS_ORDER: TaskStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'WAITING_ACKNOWLEDGE',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'COMPLETED',
  'CANCELLED',
];

// ─── Workflow Mode ────────────────────────────────────────────────────────────

export const WORKFLOW_LABELS: Record<WorkflowMode, string> = {
  IMMEDIATE: 'Trực tiếp',
  NEED_APPROVAL: 'Cần duyệt',
};

export const WORKFLOW_ORDER: WorkflowMode[] = ['IMMEDIATE', 'NEED_APPROVAL'];

// ─── RBAC Actions ─────────────────────────────────────────────────────────────

export const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  { label: 'Cơ bản',   actions: ['VIEW', 'EDIT', 'DELETE', 'CANCEL'] },
  { label: 'Workflow', actions: ['ACKNOWLEDGE', 'COMPLETE', 'TRANSFER', 'REJECT'] },
  { label: 'Boss',     actions: ['APPROVE', 'REJECT_REVIEW', 'REASSIGN', 'TOGGLE_FORCE_MODE'] },
  { label: 'Gia hạn',  actions: ['REQUEST_EXTENSION', 'APPROVE_EXTENSION', 'WITHDRAW_EXTENSION'] },
];

export const ALL_ACTIONS = ACTION_GROUPS.flatMap((g) => g.actions);
