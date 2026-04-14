'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CancelTaskPayload { taskId: string; reason?: string }

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, reason }: CancelTaskPayload) => {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Hủy công việc thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã hủy công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
