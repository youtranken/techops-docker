'use client';

import type { TaskDetail } from '../../services/task-query.service';
import { WorkflowTimeline } from './WorkflowTimeline';

interface QuickViewTimelineProps {
  task: TaskDetail;
}

export function QuickViewTimeline({ task }: QuickViewTimelineProps) {
  const isImmediate = task.workflowMode === 'IMMEDIATE';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiến trình</p>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          isImmediate
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
        }`}>
          {isImmediate ? 'Trực tiếp' : 'Cần phê duyệt'}
        </span>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-4">
        <WorkflowTimeline status={task.status} workflowMode={task.workflowMode} compact />
      </div>
    </div>
  );
}
