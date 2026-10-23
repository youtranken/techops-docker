'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

export function useRestoreTask() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/restore`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json();
        throw toApiError(body, 'Khôi phục công việc thất bại', res.status);
      }
    },
    onSuccess: (_data, taskId) => {
      toast.success('Đã khôi phục công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
