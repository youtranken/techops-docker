'use client';

import { useQuery } from '@tanstack/react-query';
import type { UserLogEntry, LogPagination } from '@/modules/logs/types';

interface UseUserHistoryOptions {
  userId: string | null;
  page?: number;
  limit?: number;
}

interface UserHistoryResult {
  data: UserLogEntry[];
  pagination: LogPagination;
}

async function fetchUserHistory(userId: string, page: number, limit: number): Promise<UserHistoryResult> {
  const params = new URLSearchParams({ userId, page: String(page), limit: String(limit) });
  const res = await fetch(`/api/logs/users?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Không thể tải lịch sử');
  }
  return res.json();
}

export function useUserHistory({ userId, page = 1, limit = 15 }: UseUserHistoryOptions) {
  return useQuery<UserHistoryResult, Error>({
    queryKey: ['hr', 'user-history', userId, page],
    queryFn: () => fetchUserHistory(userId!, page, limit),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
