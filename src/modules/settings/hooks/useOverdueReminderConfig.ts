'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OverdueReminderConfig, OverdueReminderConfigInput } from '../types';

const QK = ['overdue-reminder-config'] as const;

async function fetchConfig(): Promise<OverdueReminderConfig> {
  const res = await fetch('/api/settings/overdue-reminder-config');
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: { message?: string } }).error?.message ?? 'Lỗi tải cấu hình'); }
  return res.json();
}

export function useOverdueReminderConfig() {
  return useQuery({ queryKey: QK, queryFn: fetchConfig, staleTime: 60_000 });
}

export function useUpdateOverdueReminderConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: OverdueReminderConfigInput) => {
      const res = await fetch('/api/settings/overdue-reminder-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: { message?: string } }).error?.message ?? 'Lỗi khi lưu'); }
      return res.json() as Promise<OverdueReminderConfig>;
    },
    onSuccess: (data) => qc.setQueryData(QK, data),
  });
}
