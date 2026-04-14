'use client';

import { MessageCircle, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskListItem } from '../../services/task-query.service';
import { getDeadlineInfo } from './taskRowCard.utils';

interface TaskCardMetaProps {
  task: TaskListItem;
}

export function TaskCardMeta({ task }: TaskCardMetaProps) {
  const deadlineInfo = getDeadlineInfo(task.scheduleEnd, task.status);
  const { isPastDue, isDone, deadline } = deadlineInfo;

  return (
    <div className="flex items-center gap-2 text-xs">
      {task.extensions.some((e) => e.status === 'PENDING') && (
        <div className="flex items-center gap-0.5 text-amber-500" title="Có yêu cầu gia hạn đang chờ duyệt">
          <CalendarClock className="w-3.5 h-3.5" />
        </div>
      )}
      {task._count?.comments > 0 && (
        <div className={`relative flex items-center gap-0.5 ${task.hasMention ? 'text-indigo-500' : 'text-slate-400'}`}>
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="font-medium">{task._count.comments}</span>
          {task.hasMention && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-white" />
          )}
        </div>
      )}
      <span
        className={cn('font-semibold tabular-nums', deadlineInfo.color)}
        title={`Hoàn thành: ${deadline.toLocaleDateString('vi-VN')}`}
      >
        {deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        {isPastDue && !isDone && (
          <span className="text-red-500 font-bold ml-1">!</span>
        )}
      </span>
    </div>
  );
}
