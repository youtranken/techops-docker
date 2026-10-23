'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

interface ReassignPayload { taskId: string; newAssigneeIds: string[] }

export function useReassignTask() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, newAssigneeIds }: ReassignPayload) => {
      const res = await fetch(`/api/tasks/${taskId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAssigneeIds }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw toApiError(body, 'Giao lại thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã giao lại công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
