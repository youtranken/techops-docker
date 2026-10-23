/**
 * Luật hiển thị thông báo (trang /notifications + chuông) — hàm thuần, test ở __tests__/notification-view.test.ts.
 * Chỉ dùng API V1 sẵn có: GET /api/notifications?page&limit(≤50)&unreadOnly, PATCH /:id/read, POST /read-all.
 */

/** 14 loại của prisma enum NotificationType (V1). */
export const NOTIFICATION_TYPES = [
  'TASK_ASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'TRANSFER_RECEIVED',
  'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED',
  'REVIEW_REQUIRED', 'REVISION_REQUIRED', 'TASK_COMPLETED',
  'COMMENT_ADDED', 'DEADLINE_REMINDER', 'ALL_FAILED', 'PLAN_APPROVAL_REQUESTED',
] as const;

export type NotificationCategory = 'assign' | 'approval' | 'review' | 'ext' | 'comment' | 'due';

/** Nhóm của preview (`nt.cat.*`) — chỉ để ghi nhãn trên dòng; lọc theo loại cần API mới (Phase B). */
const CATEGORY: Record<(typeof NOTIFICATION_TYPES)[number], NotificationCategory> = {
  TASK_ASSIGNED: 'assign', TRANSFER_RECEIVED: 'assign', ALL_FAILED: 'assign',
  PLAN_APPROVAL_REQUESTED: 'approval', TASK_APPROVED: 'approval', TASK_REJECTED: 'approval',
  REVIEW_REQUIRED: 'review', REVISION_REQUIRED: 'review', TASK_COMPLETED: 'review',
  EXTENSION_REQUESTED: 'ext', EXTENSION_APPROVED: 'ext', EXTENSION_REJECTED: 'ext',
  COMMENT_ADDED: 'comment', DEADLINE_REMINDER: 'due',
};

export function notificationCategory(type: string): NotificationCategory | null {
  return (CATEGORY as Record<string, NotificationCategory>)[type] ?? null;
}

/** V1 (NotificationDropdown): bấm thông báo có công việc → /tasks/{task.id}. */
export function notificationHref(n: { task: { id: string; [k: string]: unknown } | null }): string | null {
  return n.task?.id ? `/tasks/${n.task.id}` : null;
}

export const FEED_LIMIT = 20;
export type FeedTab = 'all' | 'unread';

export function feedUrl(tab: FeedTab, page: number): string {
  return `/api/notifications?page=${page}&limit=${FEED_LIMIT}${tab === 'unread' ? '&unreadOnly=true' : ''}`;
}

export interface FeedPage<T = { id: string }> { data: T[]; total: number; page: number; limit: number }

export function nextFeedPage(last: FeedPage<unknown>): number | undefined {
  return last.page * last.limit < last.total ? last.page + 1 : undefined;
}

export function flattenFeed<T extends { id: string }>(pages: FeedPage<T>[] | undefined): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of pages ?? []) for (const it of p.data) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); }
  return out;
}
