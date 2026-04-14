'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SyncResult } from '@/modules/helpdesk/types';

// Re-export for backwards compat
export type { SyncResult };

export interface SyncLog {
  id:           string;
  mode:         string;
  synced:       number;
  pending:      number;
  skipped:      number;
  errors:       number;
  fetchedCount: number;
  ranAt:        string;
  errorDetail:  Array<{ code: string; message: string; hdId?: string }> | null;
}

export function useHelpdeskSync() {
  const qc = useQueryClient();
  const [result, setResult] = useState<SyncResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const res = await fetch('/api/integrations/helpdesk/sync', { method: 'POST' });
      const json = await res.json() as SyncResult & { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Sync thất bại');
      return json;
    },
    onSuccess: (data) => {
      setResult(data);
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-sync-logs'] });
    },
  });

  return {
    mutate:    () => mutation.mutate(),
    isLoading: mutation.isPending,
    data:      result,
    error:     mutation.error,
  };
}

export function useHelpdeskSyncLogs() {
  return useQuery({
    queryKey: ['helpdesk-sync-logs'],
    queryFn:  async (): Promise<SyncLog[]> => {
      const res = await fetch('/api/integrations/helpdesk/sync');
      if (!res.ok) throw new Error('Không thể tải lịch sử sync');
      return res.json() as Promise<SyncLog[]>;
    },
  });
}
