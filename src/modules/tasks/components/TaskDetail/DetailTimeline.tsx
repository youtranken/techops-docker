'use client';

import { WorkflowTimeline } from '../TaskQuickView/WorkflowTimeline';
import type { TaskDetail } from '../../services/task-query.service';

interface Props { task: TaskDetail }

export function DetailTimeline({ task }: Props) {
  if (task.status === 'CANCELLED') return null;

  return (
    <div className="animate-in fade-in duration-500 shrink-0 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Tiến trình</p>
      <WorkflowTimeline status={task.status} workflowMode={task.workflowMode} compact={true} />
    </div>
  );
}
