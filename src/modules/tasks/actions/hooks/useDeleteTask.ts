'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Không thể xóa công việc');
  return json;
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
