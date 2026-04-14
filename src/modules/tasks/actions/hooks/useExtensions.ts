'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useRequestExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, reason, requestedDate }: { taskId: string; reason: string; requestedDate: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, requestedDate }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Xin gia hạn thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã gửi yêu cầu gia hạn');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useApproveExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, extId, responseNote }: { taskId: string; extId: string; responseNote?: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/extension/${extId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', responseNote }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Duyệt gia hạn thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã duyệt gia hạn — deadline đã cập nhật');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, extId, responseNote }: { taskId: string; extId: string; responseNote?: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/extension/${extId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', responseNote }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Từ chối gia hạn thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã từ chối yêu cầu gia hạn');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useWithdrawExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, extId }: { taskId: string; extId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/extension/${extId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Rút yêu cầu thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã rút yêu cầu gia hạn');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
