'use client';

import { UserAvatar } from '@/shared/ui/UserAvatar';
import type { TaskListItem } from '../../services/task-query.service';
import { getAssigneeStatusColor, getAssigneeStatusLabel } from './taskRowCard.utils';

interface TaskCardAssigneesProps {
  assignees: TaskListItem['assignees'];
}

export function TaskCardAssignees({ assignees }: TaskCardAssigneesProps) {
  const completedCount    = assignees.filter((a) => a.status === 'COMPLETED').length;
  const visibleAssignees  = assignees.slice(0, 3);
  const remainingCount    = assignees.length - 3;

  return (
    <div className="flex items-center gap-2 group/assignee relative">
      <div className="flex items-center gap-1.5">
        {assignees.length > 0 ? (
          <>
            <div className="flex items-center gap-1">
              {visibleAssignees.map((assignee) => (
                <div
                  key={assignee.id}
                  className="relative transition-all duration-300 hover:scale-125 hover:rotate-12 hover:z-50 cursor-help"
                  style={{ outline: `2.5px solid ${getAssigneeStatusColor(assignee.status)}`, borderRadius: '9999px' }}
                  title={`${assignee.user.displayName} - ${getAssigneeStatusLabel(assignee.status)}`}
                >
                  <UserAvatar
                    displayName={assignee.user.displayName}
                    avatarUrl={assignee.user.profile?.avatarUrl}
                    avatarColor={assignee.user.profile?.avatarColor}
                    size="sm"
                  />
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 shadow-sm hover:scale-110 transition-transform cursor-default select-none shrink-0">
                  +{remainingCount}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-slate-500">
              {completedCount}/{assignees.length}
            </span>
          </>
        ) : (
          <span className="text-xs text-slate-400 italic">Chưa giao</span>
        )}
      </div>

      {/* Tooltip */}
      {assignees.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover/assignee:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[50] shadow-xl">
          <div className="font-semibold mb-1 border-b border-slate-600 pb-1">
            IT Support ({assignees.length})
          </div>
          <div className="flex flex-col gap-0.5 max-h-[150px] overflow-y-auto">
            {assignees.map((a) => (
              <div key={a.id} className="flex justify-between items-center gap-3">
                <span>• {a.user.displayName}</span>
                <span
                  className="text-[10px] px-1 rounded"
                  style={{ color: getAssigneeStatusColor(a.status) }}
                >
                  {getAssigneeStatusLabel(a.status)}
                </span>
              </div>
            ))}
          </div>
          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
