'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ReassignPayload { taskId: string; newAssigneeIds: string[] }

export function useReassignTask() {
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
        throw new Error(body.error?.message ?? 'Giao lại thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã giao lại công việc');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
