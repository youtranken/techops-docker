'use client';

import { useQuery } from '@tanstack/react-query';

export interface AssignableUser {
  id: string;
  displayName: string;
  username: string;
  role: { name: string };
}

export function useAssignableUsers() {
  return useQuery<{ data: AssignableUser[] }>({
    queryKey: ['tasks', 'assignable-users'],
    queryFn: async () => {
      const res = await fetch('/api/tasks/assignable-users');
      if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
      return res.json();
    },
    staleTime: 60_000,
  });
}
