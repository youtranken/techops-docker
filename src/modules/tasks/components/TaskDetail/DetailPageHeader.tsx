'use client';

import { ArrowLeft, Zap, ShieldCheck, Lock, Pencil } from 'lucide-react';
import { TaskStatusBadge } from '../TaskCard/TaskStatusBadge';
import type { TaskDetail } from '../../services/task-query.service';

interface Props {
  task: TaskDetail;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
}

function DeadlineCountdown({ scheduleEnd, status }: { scheduleEnd: Date | null; status: string }) {
  if (!scheduleEnd || status === 'COMPLETED' || status === 'CANCELLED') return null;
  const diff = Math.ceil((new Date(scheduleEnd).getTime() - Date.now()) / 86_400_000);
  if (diff > 7) return null;
  const overdue = diff < 0;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
      {overdue ? `Quá hạn ${Math.abs(diff)} ngày` : diff === 0 ? 'Hôm nay' : `Còn ${diff} ngày`}
    </span>
  );
}

export function DetailPageHeader({ task, canEdit, onBack, onEdit }: Props) {
  return (
    <div className="h-14 shrink-0 flex items-center gap-2.5 px-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Quay lại
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* taskCode */}
      {task.taskCode && (
        <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded shrink-0">
          #{task.taskCode}
        </span>
      )}

      {/* Status + Priority */}
      <TaskStatusBadge status={task.status} />
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `${task.priority.color}20`, color: task.priority.color }}>
        {task.priority.name}
      </span>

      {/* Workflow mode */}
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${task.workflowMode === 'IMMEDIATE' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
        {task.workflowMode === 'IMMEDIATE'
          ? <><Zap className="w-3 h-3 fill-current" />Trực tiếp</>
          : <><ShieldCheck className="w-3 h-3 fill-current" />Phê duyệt</>}
      </span>

      {task.isForceMode && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">
          <Lock className="w-3 h-3" />Force
        </span>
      )}

      {/* Title (truncated, fills remaining space) */}
      <p className="flex-1 min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{task.title}</p>

      {/* Deadline countdown */}
      <DeadlineCountdown scheduleEnd={task.scheduleEnd} status={task.status} />

      {/* Edit button */}
      {canEdit && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          Chỉnh sửa
        </button>
      )}
    </div>
  );
}
