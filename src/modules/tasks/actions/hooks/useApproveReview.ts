'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/approve-review`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Duyệt KQ hoàn thành thất bại');
      }
    },
    onSuccess: (_data, taskId) => {
      toast.success('Đã duyệt kết quả hoàn thành!');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
