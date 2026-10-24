import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { TaskRefEntry, TaskRefFilters } from '../types';
import { taskRefUrl } from '../view/log-logic';
import { fetchLogJson, logRetry } from './fetch-log';

/** Tra cứu mã — URL giống hệt V1 (`taskRefUrl`). API chỉ cho ADMIN/BOSS (V1). */
export function useTaskReferenceLogs(filters: TaskRefFilters = {}) {
  return useQuery<PaginatedResult<TaskRefEntry>>({
    queryKey: ['logs', 'task-reference', filters],
    queryFn: () => fetchLogJson(taskRefUrl(filters)),
    placeholderData: keepPreviousData,
    retry: logRetry,
  });
}
