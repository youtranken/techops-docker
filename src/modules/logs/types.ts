// ─── Logs Module — Central Types ────────────────────────────────────────────
// Tất cả interfaces/types của module logs — import từ đây TRƯỚC
// Không import từ services hay hooks (tránh circular dependency)

// ── Shared ────────────────────────────────────────────────────────────────────

export type LogPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LogDateRange = {
  dateFrom?: string;
  dateTo?: string;
};

// ── Task Activity ─────────────────────────────────────────────────────────────

export type TaskLogFilters = LogDateRange & {
  taskTitle?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
};

export type TaskLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  details: Record<string, unknown> | null;
  performedBy: {
    id: string;
    displayName: string;
    username: string;
    role: { name: string };
  };
  task: { id: string; taskCode: string | null; title: string } | null;
};

// ── User Activity ─────────────────────────────────────────────────────────────

export type ParsedDevice = {
  browser: string;
  browserVersion: string;
  os: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
};

export type UserLogEntry = {
  id: string;
  createdAt: string;
  action: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  ipType: 'internal' | 'external' | null;
  ispName: string | null;
  city: string | null;
  country: string | null;
  userAgent: string | null;
  parsedDevice: ParsedDevice | null;
  user: {
    id: string;
    displayName: string;
    username: string;
  } | null; // null = LOGIN_FAILED với username không tồn tại trong DB
};

export type UserLogFilters = LogDateRange & {
  userId?: string;
  action?: string;
  ipType?: string;
  page?: number;
  limit?: number;
};

// ── Task Reference ─────────────────────────────────────────────────────────────

export type TaskRefFilters = {
  search?: string;
  creatorId?: string;
  scheduleFrom?: string;
  scheduleTo?: string;
  page?: number;
  limit?: number;
};

export type TaskRefEntry = {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleStart: string;
  scheduleEnd: string;
  createdAt: string;
  creator: { id: string; displayName: string; username: string };
};

