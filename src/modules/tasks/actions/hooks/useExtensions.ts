'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

export function useRequestExtension() {
  const errMsg = useErrorMessage();
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
        throw toApiError(body, 'Xin gia hạn thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã gửi yêu cầu gia hạn');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}

export function useApproveExtension() {
  const errMsg = useErrorMessage();
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
        throw toApiError(body, 'Duyệt gia hạn thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã duyệt gia hạn — deadline đã cập nhật');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}

export function useRejectExtension() {
  const errMsg = useErrorMessage();
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
        throw toApiError(body, 'Từ chối gia hạn thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã từ chối yêu cầu gia hạn');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}

export function useWithdrawExtension() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, extId }: { taskId: string; extId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/extension/${extId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw toApiError(body, 'Rút yêu cầu thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã rút yêu cầu gia hạn');
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
