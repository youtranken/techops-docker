/**
 * Bản chép NGUYÊN VĂN logic V1 trang Nhật ký (trước A3-6) — dùng làm "đáp án" khi đối chiếu logic V2.
 * - Tham số gửi API: hooks/useTaskAuditLogs.ts, useUserActivityLogs.ts, useTaskReferenceLogs.ts (V1).
 * - Danh sách hành động trong ô lọc: components/task-activity/TaskLogFilters.tsx, user-activity/UserLogFilters.tsx (V1).
 * - Chữ cột "Chi tiết" nhật ký người dùng: components/user-activity/logDetailText.ts (V1).
 * KHÔNG sửa file này cho khớp code mới.
 */
import type { TaskLogFilters, UserLogFilters, TaskRefFilters } from '../../types';

export function v1TaskParams(filters: TaskLogFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.taskTitle) params.set('taskTitle', filters.taskTitle);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return `/api/logs/tasks?${params}`;
}

export function v1UserParams(filters: UserLogFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.ipType) params.set('ipType', filters.ipType);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return `/api/logs/users?${params}`;
}

export function v1RefParams(filters: TaskRefFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.search)       params.set('search',       filters.search);
  if (filters.creatorId)    params.set('creatorId',    filters.creatorId);
  if (filters.scheduleFrom) params.set('scheduleFrom', filters.scheduleFrom);
  if (filters.scheduleTo)   params.set('scheduleTo',   filters.scheduleTo);
  if (filters.page)         params.set('page',         String(filters.page));
  if (filters.limit)        params.set('limit',        String(filters.limit));
  return `/api/logs/task-reference?${params}`;
}

/** V1 TaskLogFilters ACTION_OPTIONS (giá trị + thứ tự) */
export const V1_TASK_ACTIONS = [
  'TASK_CREATED', 'TASK_UPDATED', 'TASK_CANCELLED', 'TASK_DELETED', 'PLAN_APPROVED', 'PLAN_REJECTED',
  'ACKNOWLEDGED', 'REJECTED', 'TRANSFERRED', 'COMPLETED', 'REVIEW_APPROVED', 'REVIEW_REJECTED', 'REASSIGNED',
  'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'EXTENSION_WITHDRAWN', 'FORCE_MODE_TOGGLED',
  'COMMENT_ADDED', 'STATUS_CHANGED',
];

/** V1 UserLogFilters ACTION_OPTIONS (giá trị + thứ tự) */
export const V1_USER_ACTIONS = [
  'LOGIN', 'LOGOUT', 'SESSION_TIMEOUT', 'LOGIN_FAILED', 'VIEW_PAGE', 'EXPORT_DATA',
  'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'RESET_PASSWORD', 'CHANGE_SETTINGS',
];

/** V1 logDetailText */
export function v1LogDetailText(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;

  // LOGIN_FAILED: hiển thị lý do
  const reason = metadata.reason as string | undefined;
  if (reason === 'USER_NOT_FOUND') return 'Username không tồn tại';
  if (reason === 'USER_INACTIVE')  return 'Tài khoản đã vô hiệu hoá';
  if (reason === 'WRONG_PASSWORD') {
    const remaining = metadata.attemptsRemaining;
    const locked = metadata.locked;
    if (locked) return 'Mật khẩu sai — IP đã bị khoá';
    if (typeof remaining === 'number') return `Mật khẩu sai — còn ${remaining} lần`;
    return 'Mật khẩu sai';
  }

  const s = metadata.setting as string | undefined;
  if (!s) return null;

  if (s === 'security_config') {
    if (metadata.action === 'reset_to_default') return 'Bảo mật: khôi phục mặc định';
    const changes = metadata.changes as string[] | undefined;
    return changes?.length ? `Bảo mật: đổi ${changes.join(', ')}` : 'Bảo mật';
  }
  if (s === 'notification_prefs') return `Thông báo email: ${metadata.emailEnabled ? 'bật' : 'tắt'}`;
  if (s === 'smtp')              return 'Cấu hình SMTP';
  if (s === 'task_type_created') return `Loại task: ${metadata.name ?? ''}`;
  if (s === 'priority_created')  return `Độ ưu tiên: ${metadata.name ?? ''}`;
  if (s === 'digest_config')     return `Digest email: ${metadata.enabled ? 'bật' : 'tắt'}`;
  if (s === 'email_template')    return `Mẫu email: ${metadata.key ?? ''}`;
  return s;
}
