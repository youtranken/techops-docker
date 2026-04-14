'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useAssignHelpdesk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      const res = await fetch(`/api/integrations/helpdesk/unassigned/${id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assigneeId }),
      });
      const json = await res.json() as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Khong the gan IT Support');
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
      if (!res.ok && res.status !== 204) throw new Error('Khong the xoa ticket');
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
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) throw new Error(`${failed} ticket gán thất bại`);
    },
    onSuccess: () => {
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
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) throw new Error(`${failed} ticket xóa thất bại`);
    },
    onSuccess: () => {
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
