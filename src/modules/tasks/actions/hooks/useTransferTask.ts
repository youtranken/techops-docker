'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface TransferPayload { taskId: string; newAssigneeId: string; notes?: string }

export function useTransferTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, newAssigneeId, notes }: TransferPayload) => {
      const res = await fetch(`/api/tasks/${taskId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAssigneeId, notes }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Chuyển giao thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã chuyển giao công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
