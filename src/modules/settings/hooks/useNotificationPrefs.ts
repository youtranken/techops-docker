'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NotificationPrefs } from '../types';
export { NOTIFICATION_TYPES } from '../types';
export type { NotificationPrefs };

async function fetchPrefs(): Promise<NotificationPrefs> {
  const res = await fetch('/api/settings/notification-prefs');
  if (!res.ok) throw new Error('Không thể tải cài đặt thông báo');
  return res.json();
}

export function useNotificationPrefs() {
  return useQuery({ queryKey: ['notification-prefs'], queryFn: fetchPrefs, staleTime: 5 * 60_000 });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { emailEnabled?: boolean; emailTypes?: string[] }) => {
      const res = await fetch('/api/settings/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });
}
