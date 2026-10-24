import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { TaskLogEntry, TaskLogFilters } from '../types';
import { taskLogUrl } from '../view/log-logic';
import { fetchLogJson, logRetry } from './fetch-log';

/** Nhật ký công việc — URL giống hệt V1 (`taskLogUrl`, có test đối chiếu). Lỗi HTTP → ném lỗi (trang hiện "Thử lại"). */
export function useTaskAuditLogs(filters: TaskLogFilters = {}) {
  return useQuery<PaginatedResult<TaskLogEntry>>({
    queryKey: ['logs', 'tasks', filters],
    queryFn: () => fetchLogJson(taskLogUrl(filters)),
    placeholderData: keepPreviousData,
    retry: logRetry,
  });
}
