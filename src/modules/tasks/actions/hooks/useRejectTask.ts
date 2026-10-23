'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

interface RejectTaskPayload { taskId: string; reason?: string }

export function useRejectTask() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, reason }: RejectTaskPayload) => {
      const res = await fetch(`/api/tasks/${taskId}/reject-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw toApiError(body, 'Từ chối công việc thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã từ chối công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
