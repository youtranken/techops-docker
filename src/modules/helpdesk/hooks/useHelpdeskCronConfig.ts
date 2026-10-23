'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CronConfig } from '../types';

async function fetchConfig(): Promise<CronConfig> {
  const res = await fetch('/api/integrations/helpdesk/cron-config');
  if (!res.ok) throw new Error('Không thể tải cấu hình lịch');
  return res.json() as Promise<CronConfig>;
}

async function saveConfig(patch: Partial<Pick<CronConfig, 'enabled' | 'hour' | 'minute' | 'enabled2' | 'hour2' | 'minute2'>>): Promise<CronConfig> {
  const res = await fetch('/api/integrations/helpdesk/cron-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const json = await res.json() as CronConfig & { error?: { message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? 'Lưu thất bại');
  return json;
}

export function useHelpdeskCronConfig(enabled = true) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['helpdesk-cron-config'],
    queryFn:  fetchConfig,
    enabled,
  });

  const mutation = useMutation({
    mutationFn: saveConfig,
    onSuccess:  (data) => qc.setQueryData(['helpdesk-cron-config'], data),
  });

  return {
    config:    query.data,
    isLoading: query.isLoading,
    save:      mutation.mutate,
    isSaving:  mutation.isPending,
    saveError: mutation.error,
  };
}
