import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { UserLogEntry, UserLogFilters } from '../types';
import { userLogUrl } from '../view/log-logic';
import { fetchLogJson, logRetry } from './fetch-log';

/** Nhật ký người dùng — URL giống hệt V1 (`userLogUrl`). */
export function useUserActivityLogs(filters: UserLogFilters = {}) {
  return useQuery<PaginatedResult<UserLogEntry>>({
    queryKey: ['logs', 'users', filters],
    queryFn: () => fetchLogJson(userLogUrl(filters)),
    placeholderData: keepPreviousData,
    retry: logRetry,
  });
}
