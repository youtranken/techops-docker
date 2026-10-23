'use client';
import { useQuery } from '@tanstack/react-query';
import type { TaskDetail } from '../services/task-query.service';

/** Lỗi tải chi tiết, giữ mã HTTP để giao diện phân biệt Không tìm thấy (404) / Không có quyền (403) / lỗi mạng. */
export class TaskLoadError extends Error {
  constructor(public status: number | null) {
    super('Không thể tải công việc');
    this.name = 'TaskLoadError';
  }
}

async function fetchTask(id: string): Promise<TaskDetail> {
  let res: Response;
  try {
    res = await fetch(`/api/tasks/${id}`);
  } catch {
    throw new TaskLoadError(null); // mất mạng
  }
  if (!res.ok) throw new TaskLoadError(res.status);
  return res.json();
}

export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTask(id),
    enabled: Boolean(id),
    staleTime: 30_000,
    // 404/403 không thử lại (kết quả không đổi); lỗi mạng/5xx thử lại như mặc định
    retry: (count, err) => {
      const s = err instanceof TaskLoadError ? err.status : null;
      if (s === 404 || s === 403) return false;
      return count < 3;
    },
  });
}
