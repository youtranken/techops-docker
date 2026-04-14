// Public API của Logs module
// Chỉ export những gì cần dùng từ module khác

// Types
export type {
  LogPagination,
  LogDateRange,
  TaskLogFilters,
  TaskLogEntry,
  ParsedDevice,
  UserLogEntry,
  UserLogFilters,
} from './types';

// Services (server-side only)
export { taskAuditLogService } from './services/task-audit-log.service';
export { userActivityLogService } from './services/user-activity-log.service';

// Hooks (client-side)
export { useTaskAuditLogs } from './hooks/useTaskAuditLogs';
export { useUserActivityLogs } from './hooks/useUserActivityLogs';

// Sections (primary consumption points)
export { TaskActivitySection } from './sections/TaskActivitySection';
export { UserActivitySection } from './sections/UserActivitySection';
