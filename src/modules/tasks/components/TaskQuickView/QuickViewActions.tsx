'use client';

import type { TaskDetail } from '../../services/task-query.service';
import type { TaskPermissions } from '../../actions/hooks/useTaskPermissions';
import { TaskActionPanel } from '../../actions/components/buttons/TaskActionPanel';

interface QuickViewActionsProps {
  task: TaskDetail;
  permissions: TaskPermissions;
  currentAssigneeIds: string[];
  currentUserId: string;
}

export function QuickViewActions({ task, permissions, currentAssigneeIds, currentUserId }: QuickViewActionsProps) {
  if (permissions.isLoading) return null;

  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3">
      <TaskActionPanel
        taskId={task.id}
        permissions={permissions}
        currentAssigneeIds={currentAssigneeIds}
        currentUserId={currentUserId}
        scheduleEnd={task.scheduleEnd}
        taskAssignees={task.assignees}
      />
    </div>
  );
}
