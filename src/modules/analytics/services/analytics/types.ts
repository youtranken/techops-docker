// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiData {
  totalTasksCreated: number;
  totalCompleted: number;
  totalCancelled: number;
  totalOverdue: number;
  avgCompletionTimeDays: number;
  onTimeRate: number;
  extensionRate: number;
  extensionCount: number;
  tasksByStatus: Record<string, number>;
  tasksByWorkflowMode: { IMMEDIATE: number; NEED_APPROVAL: number };
  tasksByPriority: { name: string; color: string; count: number }[];
  tasksByType: { name: string; color: string; count: number }[];
}

export interface UserPerformance {
  userId: string;
  displayName: string;
  totalAssigned: number;
  tasksCompleted: number;
  inProgress: number;
  rejectionCount: number;
  overdueCount: number;
  transferredCount: number;
  onTimeRate: number; // used by OnTimeByUserChart
}

export interface TrendData {
  date: string;
  created: number;
  completed: number;
}

export interface ForceModeStat {
  total: number;
  forced: number;
  forcedRate: number;
}

export interface AnalyticsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  /** RLS: Chỉ lấy dữ liệu của user này (dùng cho EMPLOYEE) */
  forUserId?: string;
}

export interface MonthlyOverview {
  month: string;
  monthLabel: string;
  created: number;
  completed: number;
  cancelled: number;
  onTimeRate: number;
}

export interface TaskTypeTime {
  typeId: string;
  name: string;
  color: string;
  avgDays: number;
  taskCount: number;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
}

// ─── Task List ────────────────────────────────────────────────────────────────

export interface TaskListRow {
  assigneeId: string;
  userId: string;
  displayName: string;
  taskId: string;
  taskTitle: string;
  taskCode: string | null;
  taskType: string;
  taskTypeColor: string;
  receivedAt: string;
  scheduleEnd: string;
  completedAt: string | null;
  processingDays: number | null;
  isOnTime: boolean | null;
  isOverdue: boolean;
  status: string;
}

export interface TaskListKpi {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  rejected: number;
  transferred: number;
}

export interface TaskListResponse {
  rows: TaskListRow[];
  total: number;
  kpi: TaskListKpi;
}

export interface TaskListFilters {
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  page: number;
  pageSize: number;
}

export interface TaskListEmployee {
  id: string;
  displayName: string;
  username: string;
}
