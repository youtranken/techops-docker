'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RejectPlanPayload { taskId: string; reason?: string }

export function useRejectPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, reason }: RejectPlanPayload) => {
      const res = await fetch(`/api/tasks/${taskId}/reject-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Từ chối kế hoạch thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã từ chối kế hoạch');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
