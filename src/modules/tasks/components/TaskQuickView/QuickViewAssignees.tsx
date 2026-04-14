'use client';

import { UserAvatar } from '@/shared/ui/UserAvatar';
import type { TaskDetail } from '../../services/task-query.service';


interface QuickViewAssigneesProps {
  assignees: TaskDetail['assignees'];
}

export function QuickViewAssignees({ assignees }: QuickViewAssigneesProps) {
  if (assignees.length === 0) return null;

  const isGrid = assignees.length >= 2;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Người thực hiện</p>
        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full">
          {assignees.length}
        </span>
      </div>

      {/* List — single col or 2-col grid */}
      <div className={isGrid ? 'grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-700/60' : 'divide-y divide-slate-100 dark:divide-slate-700/60'}>
        {assignees.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2.5 px-3 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <UserAvatar
              displayName={a.user.displayName}
              avatarUrl={a.user.profile?.avatarUrl}
              avatarColor={a.user.profile?.avatarColor}
              size="sm"
            />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{a.user.displayName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
