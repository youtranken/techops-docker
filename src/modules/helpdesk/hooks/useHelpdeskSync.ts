'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SyncResult } from '@/modules/helpdesk/types';
import { toApiError } from '@/lib/errors';
import { syncInit, type ImportBody } from '../components/HelpdeskPage/hd-logic';

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

/**
 * Gọi POST /sync như V1:
 *  - không có body = "Get từ API" (server gọi Helpdesk API thật, lọc năm hiện tại)
 *  - `{ manualData }` = nhập JSON dán tay (ManualImportCard V1)
 */
export function useHelpdeskSync() {
  const qc = useQueryClient();
  return useMutation<SyncResult, Error, ImportBody | undefined>({
    mutationFn: async (body) => {
      const res = await fetch('/api/integrations/helpdesk/sync', syncInit(body));
      const json = await res.json().catch(() => null) as (SyncResult & { error?: { message: string } }) | null;
      if (!res.ok || !json) throw toApiError(json, 'Sync thất bại', res.status);
      return json;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-sync-logs'] });
    },
  });
}

export function useHelpdeskSyncLogs(enabled = true) {
  return useQuery({
    queryKey: ['helpdesk-sync-logs'],
    enabled,
    queryFn:  async (): Promise<SyncLog[]> => {
      const res = await fetch('/api/integrations/helpdesk/sync');
      if (!res.ok) throw toApiError(await res.json().catch(() => null), 'Không thể tải lịch sử sync', res.status);
      return res.json() as Promise<SyncLog[]>;
    },
  });
}
