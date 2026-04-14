import { useQuery } from '@tanstack/react-query';

export type UserListItem = {
  id: string;
  displayName: string;
  username: string;
};

export function useLogUserList() {
  return useQuery<UserListItem[]>({
    queryKey: ['logs', 'users', 'list'],
    queryFn: () =>
      fetch('/api/logs/users/list')
        .then((r) => r.json())
        .then((res) => res.data ?? []),
    staleTime: 5 * 60 * 1000, // 5 min — user list rarely changes
  });
}
