'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskType, TaskTypeCreateInput, TaskTypeUpdateInput } from '../types';

export type { TaskType };

async function fetchTaskTypes(): Promise<TaskType[]> {
  const res = await fetch('/api/settings/task-types');
  if (!res.ok) throw new Error('Không thể tải loại công việc');
  return res.json();
}

export function useTaskTypes() {
  return useQuery({
    queryKey: ['task-types'],
    queryFn: fetchTaskTypes,
    staleTime: 5 * 60_000,
  });
}

export function useCreateTaskType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: TaskTypeCreateInput) => {
      const res = await fetch('/api/settings/task-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-types'] }),
  });
}

export function useUpdateTaskType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskTypeUpdateInput }) => {
      const res = await fetch(`/api/settings/task-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-types'] }),
  });
}

export function useDeleteTaskType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/task-types/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-types'] }),
  });
}
