'use client';

import { Zap, ShieldCheck, Lock, Headset } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';
import type { TaskDetail } from '../../services/task-query.service';
import { TaskStatusBadge } from '../TaskCard/TaskStatusBadge';

interface QuickViewHeroProps {
  task: TaskDetail;
}

export function QuickViewHero({ task }: QuickViewHeroProps) {
  return (
    <div
      className="shrink-0 mx-5 mt-4 mb-1 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
      style={{
        background: `linear-gradient(135deg, ${task.priority.color}10 0%, transparent 50%)`,
      }}
    >
      {/* Priority strip + content */}
      <div className="flex">
        <div className="w-[3px] shrink-0" style={{ backgroundColor: task.priority.color }} />

        <div className="flex-1 px-5 pt-4 pb-4">

          {/* Top row: taskCode · type · priority color pill · workflow */}
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <span className="font-mono text-[10px] font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
              #{task.taskCode ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600/50 px-1.5 py-0.5 rounded font-medium">
              {(() => { const I = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[task.type.icon]; return I ? <I className="w-3 h-3 shrink-0" /> : null; })()}
              {task.type.name}
            </span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${task.priority.color}18`, color: task.priority.color }}
            >
              {task.priority.name}
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${task.workflowMode === 'IMMEDIATE' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
              {task.workflowMode === 'IMMEDIATE'
                ? <><Zap className="w-3 h-3 fill-current" />Trực tiếp</>
                : <><ShieldCheck className="w-3 h-3 fill-current" />Phê duyệt</>}
            </span>
            {task.isForceMode && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Lock className="w-3 h-3" />Force
              </span>
            )}
            {task.hdNguonNhap === 'helpdesk' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                <Headset className="w-3 h-3" />Helpdesk
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug mb-3">
            {task.title}
          </h2>

          {/* Status badge */}
          <TaskStatusBadge status={task.status} />

          {/* Content preview */}
          {task.content && (
            <div
              className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 border-t border-slate-100 dark:border-slate-700/60 pt-3
                [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline
                [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-0.5"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.content) }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
