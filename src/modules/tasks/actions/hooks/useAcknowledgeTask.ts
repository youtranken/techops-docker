'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

export function useAcknowledgeTask() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/acknowledge`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw toApiError(body, 'Tiếp nhận thất bại', res.status);
      }
    },
    onSuccess: (_data, taskId) => {
      toast.success('Đã tiếp nhận công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
