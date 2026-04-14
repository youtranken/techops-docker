import { useQuery } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import type { UserLogEntry, UserLogFilters } from '../types';

export function useUserActivityLogs(filters: UserLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.ipType) params.set('ipType', filters.ipType);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery<PaginatedResult<UserLogEntry>>({
    queryKey: ['logs', 'users', filters],
    queryFn: () => fetch(`/api/logs/users?${params}`).then((r) => r.json()),
  });
}
