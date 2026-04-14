'use client';
import { useQuery } from '@tanstack/react-query';
import type { TaskDetail } from '../services/task-query.service';

async function fetchTask(id: string): Promise<TaskDetail> {
  const res = await fetch(`/api/tasks/${id}`);
  if (!res.ok) throw new Error('Không thể tải công việc');
  return res.json();
}

export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTask(id),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
