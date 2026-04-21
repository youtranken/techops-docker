// ─── Settings Module — All Types ──────────────────────────────────────────────
// Viết đây TRƯỚC, không import từ services/hooks (tránh circular)

// ─── Priority ────────────────────────────────────────────────────────────────

export interface Priority {
  id: string;
  name: string;
  color: string;
  level: number;
  isDefault: boolean;
  _count?: { tasks: number };
}

export type PriorityCreateInput = Omit<Priority, 'id' | '_count'>;
export type PriorityUpdateInput = Partial<PriorityCreateInput>;

// ─── TaskType ────────────────────────────────────────────────────────────────

export interface TaskType {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string | null;
  _count?: { tasks: number };
}

export type TaskTypeCreateInput = { name: string; icon?: string; description?: string; color?: string };
export type TaskTypeUpdateInput = Partial<{ name: string; color: string; icon: string; description: string }>;

// ─── UserProfile ─────────────────────────────────────────────────────────────

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: { name: string } | null;
  createdAt: string;
  profile: {
    avatarColor: string;
    avatarUrl: string | null;
    phone: string | null;
    department: string | null;
    position: string | null;
    bio: string | null;
    timezone: string;
  } | null;
}

export type ProfileUpdateInput = {
  displayName?: string;
  email?: string;
  avatarColor?: string;
  avatarUrl?: string | null;
  phone?: string;
  department?: string;
  position?: string;
  bio?: string;
  timezone?: string;
};

// ─── Notification Prefs ───────────────────────────────────────────────────────

export type NotificationRoleTarget = 'BOSS' | 'EMPLOYEE' | 'ALL';

export interface NotificationPrefs {
  userId: string;
  emailEnabled: boolean;
  emailTypes: string[];
}

export interface NotificationTypeInfo {
  label: string;
  description: string;
  roles: NotificationRoleTarget[]; // 'BOSS', 'EMPLOYEE', 'ALL'
}

export const NOTIFICATION_TYPES: Record<string, NotificationTypeInfo> = {
  TASK_ASSIGNED:           { label: 'Task được giao',             description: 'Khi task được giao cho bạn',              roles: ['EMPLOYEE'] },
  TASK_APPROVED:           { label: 'Duyệt công việc',               description: 'Khi Boss phê duyệt công việc',               roles: ['EMPLOYEE'] },
  TASK_REJECTED:           { label: 'Công việc bị từ chối',          description: 'Khi công việc bị Boss từ chối',              roles: ['EMPLOYEE'] },
  TRANSFER_RECEIVED:       { label: 'Nhận chuyển giao',           description: 'Khi task được chuyển giao cho bạn',       roles: ['EMPLOYEE'] },
  EXTENSION_REQUESTED:     { label: 'Yêu cầu gia hạn',           description: 'Khi nhân viên yêu cầu gia hạn deadline',  roles: ['BOSS'] },
  EXTENSION_APPROVED:      { label: 'Gia hạn được chấp nhận',    description: 'Khi Boss chấp nhận yêu cầu gia hạn',      roles: ['EMPLOYEE'] },
  EXTENSION_REJECTED:      { label: 'Gia hạn bị từ chối',        description: 'Khi Boss từ chối yêu cầu gia hạn',        roles: ['EMPLOYEE'] },
  REVIEW_REQUIRED:         { label: 'Cần review task',           description: 'Khi task chờ Boss review',                roles: ['BOSS'] },
  REVISION_REQUIRED:       { label: 'Cần chỉnh sửa lại',         description: 'Khi Boss yêu cầu làm lại',                roles: ['EMPLOYEE'] },
  TASK_COMPLETED:          { label: 'Công việc đã được duyệt hoàn thành', description: 'Khi Boss duyệt kết quả và công việc hoàn thành', roles: ['EMPLOYEE', 'BOSS'] },
  COMMENT_ADDED:           { label: 'Bình luận mới',              description: 'Khi có bình luận mới trong task',         roles: ['EMPLOYEE', 'BOSS'] },
  DEADLINE_REMINDER:       { label: 'Nhắc nhở deadline',          description: 'Trước khi task đến hạn 24h',              roles: ['EMPLOYEE', 'BOSS'] },
  ALL_FAILED:              { label: 'Tất cả assignee từ chối',   description: 'Khi toàn bộ người nhận task đều từ chối', roles: ['BOSS'] },
  PLAN_APPROVAL_REQUESTED: { label: 'Yêu cầu duyệt công việc',     description: 'Khi nhân viên gửi công việc cần duyệt',    roles: ['BOSS'] },
};

// ─── SMTP Config ─────────────────────────────────────────────────────────────

export interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string; // masked on read
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  updatedAt: string;
}

export type SmtpConfigInput = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string; // optional on update (keep existing if empty)
  fromName: string;
  fromEmail: string;
  isActive: boolean;
};

// ─── Email Template ────────────────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  key: string;       // e.g. TASK_ASSIGNED
  subject: string;
  body: string;      // HTML
  isActive: boolean;
  updatedAt: string;
}

export type EmailTemplateInput = {
  subject: string;
  body: string;
  isActive?: boolean;
};

// ─── Security Config ─────────────────────────────────────────────────────────

/** Cấu hình Rate Limiting */
export interface RateLimitConfig {
  /** Bật/tắt rate limiting */
  enabled: boolean;
  /** Số request tối đa trong window */
  maxRequests: number;
  /** Khoảng thời gian window (giây) */
  windowSeconds: number;
  /** Số lần login fail trước khi khóa */
  loginMaxAttempts: number;
  /** Thời gian khóa sau khi vượt limit (phút) */
  lockoutMinutes: number;
}

/** Cấu hình Password Policy */
export interface PasswordPolicyConfig {
  /** Độ dài tối thiểu */
  minLength: number;
  /** Yêu cầu chữ hoa */
  requireUppercase: boolean;
  /** Yêu cầu chữ thường */
  requireLowercase: boolean;
  /** Yêu cầu số */
  requireNumber: boolean;
  /** Yêu cầu ký tự đặc biệt */
  requireSpecialChar: boolean;
  /** Số ngày hết hạn password (0 = không hết hạn) */
  expiryDays: number;
  /** Số password cũ không được dùng lại */
  historyCount: number;
}

/** Cấu hình Session */
export interface SessionConfig {
  /** Thời gian timeout không hoạt động (phút) */
  idleTimeoutMinutes: number;
  /** Thời gian tối đa của session (giờ) */
  maxSessionHours: number;
  /** Cho phép nhiều session đồng thời */
  allowMultipleSessions: boolean;
}

/** Toàn bộ cấu hình bảo mật */
export interface SecurityConfig {
  rateLimit: RateLimitConfig;
  passwordPolicy: PasswordPolicyConfig;
  session: SessionConfig;
}

/** Giá trị mặc định cho Security Config */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowSeconds: 60,
    loginMaxAttempts: 5,
    lockoutMinutes: 15,
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
    expiryDays: 0,
    historyCount: 0,
  },
  session: {
    idleTimeoutMinutes: 30,
    maxSessionHours: 24,
    allowMultipleSessions: true,
  },
};

// ─── Digest Config ─────────────────────────────────────────────────────────────────────────────

export type DigestContentType =
  | 'DEADLINE_SOON'
  | 'IN_PROGRESS'
  | 'OVERDUE'
  | 'PENDING_APPROVAL'
  | 'SUMMARY_BY_EMPLOYEE';

export interface DigestContentInfo {
  label: string;
  description: string;
}

export const DIGEST_CONTENT_TYPES: Record<DigestContentType, DigestContentInfo> = {
  DEADLINE_SOON:        { label: 'Tasks sắp hết hạn',         description: 'Tasks có deadline trong vòng 2 ngày tới' },
  IN_PROGRESS:          { label: 'Tasks đang thực hiện',       description: 'Tổng hợp task đang làm của từng nhân viên' },
  OVERDUE:              { label: 'Tasks quá hạn',              description: 'Tasks đã hết hạn chưa hoàn thành' },
  PENDING_APPROVAL:     { label: 'Tasks chờ duyệt',           description: 'Tasks đang chờ Boss/Admin phê duyệt' },
  SUMMARY_BY_EMPLOYEE:  { label: 'Tóm tắt theo nhân viên',    description: 'Số task đang làm / hoàn thành / quá hạn từng người' },
};

export interface DigestConfig {
  id: string;
  enabled: boolean;
  sendWeekly: boolean;
  sendMonthly: boolean;
  sendDays: number[];
  sendHour: number;
  sendMinute: number;
  contentTypes: DigestContentType[];
  recipientIds: string[];
  emailSubject: string;
  emailGreeting: string;
  updatedAt: string;
  updatedBy: string | null;
}

export type DigestConfigInput = Omit<DigestConfig, 'id' | 'updatedAt' | 'updatedBy'>;

export const DIGEST_CATEGORIES = ['PENDING_APPROVAL', 'PENDING_REVIEW', 'IN_PROGRESS', 'WAITING_ACKNOWLEDGE'] as const;
export type DigestCategory = typeof DIGEST_CATEGORIES[number];

export const INDIVIDUAL_EMAIL_TYPES = ['OVERDUE', 'PENDING_ACK', 'UPCOMING'] as const;
export type IndividualEmailType = typeof INDIVIDUAL_EMAIL_TYPES[number];

export const INDIVIDUAL_EMAIL_TYPE_INFO: Record<IndividualEmailType, { icon: string; label: string; colorClass: string }> = {
  OVERDUE:     { icon: '🚨', label: 'Quá hạn chưa hoàn thành',         colorClass: 'text-red-700' },
  PENDING_ACK: { icon: '⚠️', label: 'Chưa tiếp nhận & đã quá hạn',     colorClass: 'text-orange-700' },
  UPCOMING:    { icon: '⏰', label: 'Sắp đến hạn trong 24h (task ≥ 1 ngày)', colorClass: 'text-sky-700' },
};

export interface OverdueReminderConfig {
  id: string;
  enabled: boolean;
  sendDays: number[];
  sendHour: number;
  sendMinute: number;
  digestCategories: DigestCategory[];
  individualEmailTypes: IndividualEmailType[];
  updatedAt: string;
  updatedBy: string | null;
}

export type OverdueReminderConfigInput = Omit<OverdueReminderConfig, 'id' | 'updatedAt' | 'updatedBy'>;
