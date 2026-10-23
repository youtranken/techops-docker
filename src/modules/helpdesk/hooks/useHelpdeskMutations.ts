'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toApiError, ApiError } from '@/lib/errors';
import { countBulkFailures } from '../components/HelpdeskPage/hd-logic';

/** Lỗi gán/xoá hàng loạt: `failed` = số ticket không thành công (giao diện tự dịch) */
export class BulkError extends ApiError {
  constructor(public failed: number) { super(`${failed} ticket thất bại`, 'BULK_PARTIAL'); }
}

export function useAssignHelpdesk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      const res = await fetch(`/api/integrations/helpdesk/unassigned/${id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assigneeId }),
      });
      const json = await res.json().catch(() => null) as { error?: { message: string } } | null;
      if (!res.ok) throw toApiError(json, 'Không thể gán IT Support', res.status);
      return json;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
    },
  });
}

export function useDeleteHelpdesk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/integrations/helpdesk/unassigned/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw toApiError(await res.json().catch(() => null), 'Không thể xóa ticket', res.status);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
    },
  });
}

export function useBulkAssignHelpdesk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, assigneeId }: { ids: string[]; assigneeId: string }) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/integrations/helpdesk/unassigned/${id}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ assigneeId }),
          }),
        ),
      );
      // V1 chỉ đếm lỗi mạng → HTTP 4xx/5xx bị báo "thành công". V2 đếm cả HTTP lỗi.
      const failed = countBulkFailures(results);
      if (failed > 0) throw new BulkError(failed);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
    },
  });
}

export function useBulkDeleteHelpdesk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/integrations/helpdesk/unassigned/${id}`, { method: 'DELETE' })),
      );
      const failed = countBulkFailures(results);
      if (failed > 0) throw new BulkError(failed);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
    },
  });
}

export function useRetryHelpdeskTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hdIds: string[]) => {
      const res = await fetch('/api/integrations/helpdesk/sync/retry', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hdIds }),
      });
      const json = await res.json() as { retried: number; synced: number; errors: Array<{ hdId: string; message: string }> } & { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Retry thất bại');
      return json;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-sync-logs'] });
    },
  });
}
