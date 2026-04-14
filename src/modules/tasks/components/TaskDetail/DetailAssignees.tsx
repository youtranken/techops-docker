'use client';

import { Users } from 'lucide-react';
import { DetailAssigneeItem } from './DetailAssigneeItem';
import type { TaskDetail } from '../../services/task-query.service';

interface Props { assignees: TaskDetail['assignees'] }

export function DetailAssignees({ assignees }: Props) {
  if (assignees.length === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 delay-150 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-500 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        <Users className="w-3.5 h-3.5 text-emerald-600" />
        Người thực hiện
      </p>
      <div className="flex flex-col gap-2">
        {assignees.map((a) => (
          <DetailAssigneeItem key={a.id} assignee={a} />
        ))}
      </div>
    </div>
  );
}
