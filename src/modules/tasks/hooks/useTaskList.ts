'use client';
import { useQuery } from '@tanstack/react-query';
import type { TaskListFilters, TaskListItem } from '../services/task-query.service';
import type { PaginatedResult } from '@/lib/types/pagination';

async function fetchTasks(filters: TaskListFilters): Promise<PaginatedResult<TaskListItem>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await fetch(`/api/tasks?${params}`);
  if (!res.ok) throw new Error('Không thể tải danh sách công việc');
  return res.json();
}

export function useTaskList(filters: TaskListFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
    staleTime: 30_000,
  });
}
