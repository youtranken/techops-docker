import { useQuery } from '@tanstack/react-query';
import type { KpiData, UserPerformance, TrendData, MonthlyOverview, TaskTypeTime, FunnelStage, TaskListResponse, TaskListEmployee } from '../services/analytics.service';
import type { WorkloadEntry, OverdueTask } from '../services/research.service';

interface DateFilters {
  dateFrom?: string;
  dateTo?: string;
}

async function fetchWithCheck<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useKpiOverview(filters: DateFilters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  );
  return useQuery<KpiData>({
    queryKey: ['analytics', 'kpi', filters],
    queryFn: () => fetchWithCheck(`/api/analytics/kpi?${params}`),
    staleTime: 300_000, // 5 min
  });
}

export function useTrends(period: 'day' | 'week' | 'month' = 'day') {
  return useQuery<TrendData[]>({
    queryKey: ['analytics', 'trends', period],
    queryFn: () => fetchWithCheck(`/api/analytics/trends?period=${period}`),
    staleTime: 600_000, // 10 min
  });
}

export function useUserPerformance(filters: DateFilters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  );
  return useQuery<UserPerformance[]>({
    queryKey: ['analytics', 'performance', filters],
    queryFn: () => fetchWithCheck(`/api/analytics/performance?${params}`),
    staleTime: 900_000, // 15 min
  });
}

export function useWorkloadBalance() {
  return useQuery<WorkloadEntry[]>({
    queryKey: ['analytics', 'workload'],
    queryFn: () => fetchWithCheck('/api/analytics/workload'),
    staleTime: 300_000,
  });
}

export function useOverdueTasks(filters: DateFilters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  );
  return useQuery<OverdueTask[]>({
    queryKey: ['analytics', 'overdue', filters],
    queryFn: () => fetchWithCheck(`/api/analytics/overdue?${params}`),
    staleTime: 60_000,
  });
}

export function useMonthlyOverview(year: number) {
  return useQuery<MonthlyOverview[]>({
    queryKey: ['analytics', 'monthly', year],
    queryFn: () => fetchWithCheck(`/api/analytics/monthly-overview?year=${year}`),
    staleTime: 600_000, // 10 min
  });
}

export function useTaskTypeTime(filters: DateFilters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  );
  return useQuery<TaskTypeTime[]>({
    queryKey: ['analytics', 'tasktype', filters],
    queryFn: () => fetchWithCheck(`/api/analytics/task-types?${params}`),
    staleTime: 300_000,
  });
}

export function useTaskFlowFunnel(filters: DateFilters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  );
  return useQuery<FunnelStage[]>({
    queryKey: ['analytics', 'funnel', filters],
    queryFn: () => fetchWithCheck(`/api/analytics/funnel?${params}`),
    staleTime: 300_000,
  });
}

interface TaskListQueryFilters extends DateFilters {
  userId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export function useTaskList(filters: TaskListQueryFilters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])),
  );
  return useQuery<TaskListResponse>({
    queryKey: ['analytics', 'task-list', filters],
    queryFn: async () => {
      const json = await fetchWithCheck<{ data: TaskListResponse }>(`/api/analytics/task-list?${params}`);
      return json.data;
    },
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useTaskListEmployees() {
  return useQuery<TaskListEmployee[]>({
    queryKey: ['analytics', 'task-list', 'employees'],
    queryFn: async () => {
      const json = await fetchWithCheck<{ data: TaskListEmployee[] }>('/api/analytics/task-list/employees');
      return json.data;
    },
    staleTime: 5 * 60_000,
  });
}
