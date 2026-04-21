'use client';

import { Info } from 'lucide-react';
import type { TaskDetail } from '../../services/task-query.service';
import { formatDateShort } from '../TaskQuickView/taskQuickView.utils';

interface Props { task: TaskDetail }

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</span>
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{children}</div>
    </div>
  );
}

export function DetailSidebarMeta({ task }: Props) {
  const isOverdue =
    task.scheduleEnd &&
    new Date(task.scheduleEnd) < new Date() &&
    task.status !== 'COMPLETED';

  const diff = task.scheduleEnd
    ? Math.ceil((new Date(task.scheduleEnd).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-500 p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        <Info className="w-3.5 h-3.5 text-indigo-500" />
        Thông tin
      </h3>

      <div className="space-y-3">
        <MetaField label="Người tạo">{task.creator.displayName}</MetaField>
        <MetaField label="Loại công việc">{task.type.name}</MetaField>
        <MetaField label="Ngày tạo">{formatDateShort(task.createdAt)}</MetaField>
        {task.scheduleStart && (
          <MetaField label="Ngày bắt đầu">{formatDateShort(task.scheduleStart)}</MetaField>
        )}
        <div className="flex flex-col pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Hạn hoàn thành</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {task.scheduleEnd ? formatDateShort(task.scheduleEnd) : '—'}
            </span>
            {diff !== null && task.status !== 'COMPLETED' && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : diff <= 3 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'}`}>
                {isOverdue ? `Quá hạn ${Math.abs(diff)} ngày` : diff === 0 ? 'Hôm nay' : `Còn ${diff} ngày`}
              </span>
            )}
          </div>
        </div>
        {task.completedAt && (
          <MetaField label="Hoàn thành lúc">
            <span className="text-emerald-600">{formatDateShort(task.completedAt)}</span>
          </MetaField>
        )}
        {task.hdNguonNhap === 'helpdesk' && task.hdCode && (
          <MetaField label="Helpdesk">
            <span className="text-indigo-600 font-mono">HD-{task.hdCode}</span>
          </MetaField>
        )}
      </div>
    </div>
  );
}
