'use client';

/** Người nhận việc khi gán ticket — cùng nguồn V1 (`/api/tasks/assignable-users`). */
import { useQuery } from '@tanstack/react-query';

export interface AssignableUser { id: string; displayName: string }

export function useHdAssignableUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['helpdesk', 'assignable-users'],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AssignableUser[]> => {
      const res = await fetch('/api/tasks/assignable-users');
      const json = await res.json().catch(() => null) as { data?: AssignableUser[] } | null;
      return Array.isArray(json?.data) ? json.data : [];
    },
  });
}
