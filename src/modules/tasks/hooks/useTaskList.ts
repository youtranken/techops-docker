'use client';
import { useQuery } from '@tanstack/react-query';
import type { TaskListFilters, TaskListItem } from '../services/task-query.service';
import type { PaginatedResult } from '@/lib/types/pagination';

export async function fetchTasks(filters: TaskListFilters): Promise<PaginatedResult<TaskListItem>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const res = await fetch(`/api/tasks?${params}`);
  if (!res.ok) throw new Error('Không thể tải danh sách công việc');
  return res.json();
}

/** `enabled: false` — chế độ Bảng (A2-4) tự tải theo từng cột (`useBoardData`), không gọi trang danh sách. */
export function useTaskList(filters: TaskListFilters = {}, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchTasks(filters),
    staleTime: 30_000,
    enabled: opts.enabled ?? true,
  });
}
