'use client';

import { User, Calendar, Tag, Link2, Info } from 'lucide-react';
import type { TaskDetail } from '../../services/task-query.service';
import { MetaCell } from '../TaskDetail/MetaCell';
import { formatDateShort } from './taskQuickView.utils';

interface QuickViewMetaProps {
  task: TaskDetail;
}

export function QuickViewMeta({ task }: QuickViewMetaProps) {
  const isOverdue = task.scheduleEnd && new Date(task.scheduleEnd) < new Date() && task.status !== 'COMPLETED';
  const hasHdCode = 'hdCode' in task && task.hdCode;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Thông tin</p>
      </div>

      {/* Grid 2 cols */}
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-700/60">
        <MetaCell
          icon={User} iconBg="bg-indigo-50 dark:bg-indigo-900/30" iconColor="text-indigo-500 dark:text-indigo-400"
          label="Người tạo" value={task.creator.displayName}
        />
        <MetaCell
          icon={Tag} iconBg="bg-violet-50 dark:bg-violet-900/30" iconColor="text-violet-500 dark:text-violet-400"
          label="Loại CV" value={task.type.name}
        />
        <MetaCell
          icon={Calendar} iconBg="bg-slate-100 dark:bg-slate-700/60" iconColor="text-slate-500 dark:text-slate-400"
          label="Bắt đầu" value={formatDateShort(task.scheduleStart)}
        />
        <MetaCell
          icon={Calendar}
          iconBg={isOverdue ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}
          iconColor={isOverdue ? 'text-red-400 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}
          label="Hoàn thành" value={formatDateShort(task.scheduleEnd)}
          valueClass={isOverdue ? 'text-red-500' : 'text-slate-700'}
        />
        {hasHdCode && (
          <div className="col-span-2 flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700/60">
            <div className="shrink-0 rounded-md p-1.5 bg-amber-50 dark:bg-amber-900/30">
              <Link2 className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Helpdesk</p>
              <p className="text-xs font-semibold font-mono text-indigo-600 truncate">HD-{String(task.hdCode)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
