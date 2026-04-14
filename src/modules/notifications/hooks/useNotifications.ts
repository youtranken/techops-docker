import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationWithTask } from '../services/notification.service';

export function useNotifications() {
  return useQuery<NotificationWithTask[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const response = await res.json();
      // API returns { data, total, page, limit } - extract data array
      return response.data || [];
    },
    refetchInterval: 30_000, // Poll every 30s
    refetchOnWindowFocus: true,
  });
}

export function useNotificationCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      fetch('/api/notifications/unread-count')
        .then((r) => r.json())
        .then((data: { count: number }) => data.count),
    refetchInterval: 15_000, // Poll every 15s for badge
    refetchOnWindowFocus: true,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch('/api/notifications/read-all', { method: 'POST' }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count'] });
      const previousCount = queryClient.getQueryData<number>(['notifications', 'unread-count']);
      queryClient.setQueryData(['notifications', 'unread-count'], 0);
      return { previousCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        ['notifications', 'unread-count'],
        context?.previousCount ?? 0,
      );
    },
  });
}
