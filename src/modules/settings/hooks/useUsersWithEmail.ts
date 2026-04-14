'use client';
import { useQuery } from '@tanstack/react-query';

export interface UserEmailOption {
  id: string;
  displayName: string;
  email: string;
  username: string;
}

export function useUsersWithEmail() {
  return useQuery<UserEmailOption[]>({
    queryKey: ['users-with-email'],
    queryFn: async () => {
      const res = await fetch('/api/hr/users?limit=200&isActive=true');
      if (!res.ok) throw new Error('Không thể tải danh sách người dùng');
      const json = await res.json();
      // Filter to only users that have an email set
      const users: { id: string; displayName: string; email: string | null; username: string }[] =
        json.data ?? [];
      return users
        .filter((u) => u.email)
        .map((u) => ({ id: u.id, displayName: u.displayName, email: u.email!, username: u.username }));
    },
    staleTime: 2 * 60_000,
  });
}
