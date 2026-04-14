import { useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { TaskLogEntry, TaskLogFilters } from '../types';

export function useTaskAuditLogs(filters: TaskLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.taskTitle) params.set('taskTitle', filters.taskTitle);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery<PaginatedResult<TaskLogEntry>>({
    queryKey: ['logs', 'tasks', filters],
    queryFn: () => fetch(`/api/logs/tasks?${params}`).then((r) => r.json()),
  });
}
