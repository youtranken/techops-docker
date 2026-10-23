'use client';

import { useTaskDetail } from '../../hooks/useTaskDetail';
import { TaskDetailClient } from './TaskDetailClient';
import { Loader2 } from 'lucide-react';

interface Props { id: string }

export function TaskDetailLoader({ id }: Props) {
  const { data: task, isLoading, isError } = useTaskDetail(id);

  if (isLoading) {
    return (
      <div className="v2-bleed h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Đang tải công việc...</p>
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="v2-bleed h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-sm font-medium">Không tìm thấy công việc</p>
          <p className="text-xs mt-1">Công việc có thể đã bị xóa hoặc bạn không có quyền xem</p>
        </div>
      </div>
    );
  }

  return <TaskDetailClient task={task} />;
}
