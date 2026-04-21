'use client';

import React from 'react';
import { Zap, ShieldCheck, Lock, Headset } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskCardAssignees } from './TaskCardAssignees';
import { TaskCardMeta } from './TaskCardMeta';
import { TaskCardMenu } from './TaskCardMenu';
import { useTaskCardActions } from '../../hooks/useTaskCardActions';
import type { TaskRowCardProps } from './TaskRowCard.types';

export type { TaskRowCardProps };

export function TaskRowCard({
  task,
  permissions,
  onOpenQuickView,
  onEdit,
  onOpenComplete,
  onOpenTransfer,
  onOpenRejectTask,
  onOpenRejectReview,
  onOpenCancel,
  onOpenRestore,
  onOpenRejectPlan,
  onOpenExtension,
  onOpenApproveExtension,
}: TaskRowCardProps) {
  const { handleAcknowledge, handleApprovePlan, handleApproveReview } = useTaskCardActions(task.id);

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white dark:bg-slate-800/60 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all duration-200 cursor-pointer h-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${task.priority.color}08 0%, transparent 35%)`,
      }}
      onClick={() => onOpenQuickView(task.id)}
    >
      {/* Left priority strip */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: task.priority.color }} />

      <div className="pl-4 pr-3 pt-3 pb-3 flex flex-col h-full">

        {/* Row 1: top bar — ID · workflow mode · flags · menu */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded tracking-wide">
              {task.hdNguonNhap === 'helpdesk' && task.hdCode
                ? `HD-${task.hdCode}`
                : (task.taskCode ?? '—')}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold',
                task.workflowMode === 'IMMEDIATE' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
              )}
            >
              {task.workflowMode === 'IMMEDIATE'
                ? <><Zap className="w-3 h-3 fill-current" /><span>Trực tiếp</span></>
                : <><ShieldCheck className="w-3 h-3 fill-current" /><span>Phê duyệt</span></>}
            </span>
            {task.isForceMode && (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-semibold">
                <Lock className="w-3 h-3" />Force
              </span>
            )}
            {task.hdNguonNhap === 'helpdesk' && (
              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 text-[10px] font-semibold">
                <Headset className="w-3 h-3" />HD
              </span>
            )}
          </div>
          <TaskCardMenu
            task={task} permissions={permissions}
            onOpenQuickView={onOpenQuickView} onEdit={onEdit}
            onOpenComplete={onOpenComplete} onOpenTransfer={onOpenTransfer}
            onOpenRejectTask={onOpenRejectTask} onOpenRejectReview={onOpenRejectReview}
            onOpenCancel={onOpenCancel} onOpenRestore={onOpenRestore} onOpenRejectPlan={onOpenRejectPlan}
            onOpenExtension={onOpenExtension} onOpenApproveExtension={onOpenApproveExtension}
            onAcknowledge={handleAcknowledge} onApprovePlan={handleApprovePlan} onApproveReview={handleApproveReview}
          />
        </div>

        {/* Row 2: Status badge + type pill */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <TaskStatusBadge status={task.status} />
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600/50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {(() => { const I = (LucideIcons as unknown as Record<string, React.ComponentType<{className?:string}>>)[task.type.icon]; return I ? <I className="w-3 h-3 shrink-0" /> : null; })()}
            {task.type.name}
          </span>
        </div>

        {/* Row 3: Title */}
        <div className="flex-1 mb-3">
          <h3
            className="font-semibold text-[14px] text-slate-900 dark:text-slate-100 leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors duration-150"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}
            title={task.title}
          >
            {task.title}
          </h3>
        </div>

        {/* Row 4: Footer — assignees + deadline/meta */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
          <TaskCardAssignees assignees={task.assignees} />
          <TaskCardMeta task={task} />
        </div>

      </div>
    </div>
  );
}
