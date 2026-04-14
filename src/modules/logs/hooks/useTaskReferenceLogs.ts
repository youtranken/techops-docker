import { useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { TaskRefEntry, TaskRefFilters } from '../types';

export function useTaskReferenceLogs(filters: TaskRefFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search)       params.set('search',       filters.search);
  if (filters.creatorId)    params.set('creatorId',    filters.creatorId);
  if (filters.scheduleFrom) params.set('scheduleFrom', filters.scheduleFrom);
  if (filters.scheduleTo)   params.set('scheduleTo',   filters.scheduleTo);
  if (filters.page)         params.set('page',         String(filters.page));
  if (filters.limit)        params.set('limit',        String(filters.limit));

  return useQuery<PaginatedResult<TaskRefEntry>>({
    queryKey: ['logs', 'task-reference', filters],
    queryFn: () => fetch(`/api/logs/task-reference?${params}`).then((r) => r.json()),
  });
}
