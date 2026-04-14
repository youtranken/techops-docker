'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RejectReviewEntry { assigneeId?: string; reason?: string }
interface RejectReviewPayload { taskId: string; entries: RejectReviewEntry[] }

export function useRejectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, entries }: RejectReviewPayload) => {
      const res = await fetch(`/api/tasks/${taskId}/reject-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Từ chối kết quả thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã yêu cầu làm lại');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
