import {
  type AnalyticsFilters,
  type KpiData,
  type UserPerformance,
  type TrendData,
  type ForceModeStat,
  type MonthlyOverview,
  type TaskTypeTime,
  type FunnelStage,
  type TaskListFilters,
  type TaskListResponse,
  type TaskListEmployee,
  queryKpiOverview,
  queryUserPerformance,
  queryTrends,
  queryForceModeStat,
  queryMonthlyOverview,
  queryAvgTimeByTaskType,
  queryTaskFlowFunnel,
  queryTaskList,
  queryTaskListEmployees,
} from './analytics';

export type { KpiData, UserPerformance, TrendData, ForceModeStat, MonthlyOverview, TaskTypeTime, FunnelStage, TaskListResponse, TaskListEmployee, TaskListRow, TaskListKpi } from './analytics';

// ─── Service ─────────────────────────────────────────────────────────────────

class AnalyticsService {
  async getKpiOverview(filters: AnalyticsFilters): Promise<KpiData> {
    return queryKpiOverview(filters);
  }

  async getUserPerformance(filters: AnalyticsFilters): Promise<UserPerformance[]> {
    return queryUserPerformance(filters);
  }

  async getTrends(period: 'day' | 'week' | 'month' = 'day'): Promise<TrendData[]> {
    return queryTrends(period);
  }

  async getForceModeStat(): Promise<ForceModeStat> {
    return queryForceModeStat();
  }
  async getMonthlyOverview(year: number): Promise<MonthlyOverview[]> {
    return queryMonthlyOverview(year);
  }

  async getAvgTimeByTaskType(filters: AnalyticsFilters): Promise<TaskTypeTime[]> {
    return queryAvgTimeByTaskType(filters);
  }

  async getTaskFlowFunnel(filters: AnalyticsFilters): Promise<FunnelStage[]> {
    return queryTaskFlowFunnel(filters);
  }

  async getTaskList(filters: TaskListFilters): Promise<TaskListResponse> {
    return queryTaskList(filters);
  }

  async getTaskListEmployees(): Promise<TaskListEmployee[]> {
    return queryTaskListEmployees();
  }
}

export const analyticsService = new AnalyticsService();
