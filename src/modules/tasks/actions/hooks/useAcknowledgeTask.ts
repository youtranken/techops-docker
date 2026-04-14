'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAcknowledgeTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/acknowledge`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Tiếp nhận thất bại');
      }
    },
    onSuccess: (_data, taskId) => {
      toast.success('Đã tiếp nhận công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
