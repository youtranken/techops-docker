'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTaskInput } from '../validators/update-task.schema';

async function updateTask({ id, data }: { id: string; data: UpdateTaskInput }) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Không thể cập nhật công việc');
  return json;
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', id] });
      qc.invalidateQueries({ queryKey: ['task-counters'] });
    },
  });
}
