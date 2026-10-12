'use client';

import { ArrowLeft, Pencil } from 'lucide-react';
import { TaskStatusBadge } from '../TaskCard/TaskStatusBadge';
import { TaskActionPanel } from '../../actions/components/buttons/TaskActionPanel';
import type { TaskDetail } from '../../services/task-query.service';
import type { TaskPermissions } from '../../actions/hooks/useTaskPermissions';
import { ImportantStarButton } from '../TaskCard/ImportantStarButton';
import { isTrackingRole } from '../../hooks/useTaskTracking';
import { DetailContent } from './DetailContent';

interface Props {
  task: TaskDetail;
  permissions: TaskPermissions;
  currentAssigneeIds: string[];
  currentUserId: string;
  roleName: string;
  onBack: () => void;
  onEdit: () => void;
}

const WORKFLOW_LABEL: Record<string, string> = {
  IMMEDIATE: 'Trực tiếp',
  NEED_APPROVAL: 'Phê duyệt',
};

const WORKFLOW_CLASS: Record<string, string> = {
  IMMEDIATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  NEED_APPROVAL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export function DetailHero({ task, permissions, currentAssigneeIds, currentUserId, roleName, onBack, onEdit }: Props) {
  const hasActions =
    permissions.canAcknowledge || permissions.canComplete ||
    permissions.canApprovePlan || permissions.canRejectPlan ||
    permissions.canApproveReview || permissions.canRejectReview ||
    permissions.canRejectTask || permissions.canTransfer ||
    permissions.canReassign || permissions.canCancel ||
    permissions.canRestore || permissions.canRequestExtension;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300 shrink-0 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/50 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 pt-4 pb-4">
      {/* Nav row */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        {permissions.canEdit && (
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            Chỉnh sửa
          </button>
        )}
      </div>
      {/* ID inline with title */}
      {task.taskCode && (
        <p className="font-mono text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded inline-block mb-1">#{task.taskCode}</p>
      )}
      {/* Title */}
      <div className="flex items-start gap-1.5 mb-3">
        <ImportantStarButton taskId={task.id} isImportant={task.isImportant} canToggle={isTrackingRole(roleName)} size="md" className="mt-0.5" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">{task.title}</h1>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <TaskStatusBadge status={task.status} />
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${task.priority.color}20`, color: task.priority.color }}
        >
          {task.priority.name}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${WORKFLOW_CLASS[task.workflowMode] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          {WORKFLOW_LABEL[task.workflowMode] ?? task.workflowMode}
        </span>
      </div>

      {/* Action buttons */}
      {hasActions && (
        <div className="mb-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl px-3 py-2.5 border border-indigo-100/80 dark:border-indigo-700/40">
          <TaskActionPanel
            taskId={task.id}
            permissions={permissions}
            currentAssigneeIds={currentAssigneeIds}
            currentUserId={currentUserId}
            scheduleEnd={task.scheduleEnd ?? undefined}
            taskAssignees={task.assignees}
          />
        </div>
      )}

      {/* Content — thu gọn, dài thì có "Xem toàn bộ" */}
      {task.content ? (
        <DetailContent html={task.content} />
      ) : (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic">Không có mô tả</p>
      )}
    </div>
  );
}
