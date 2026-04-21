'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import type { DrillDownType, DrillDownTask } from '@/app/api/analytics/drilldown/route';

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Đang thực hiện',
  PENDING_REVIEW: 'Chờ review',
  PENDING_APPROVAL: 'Chờ duyệt',
  WAITING_ACKNOWLEDGE: 'Chờ xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const STATUS_STYLE: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PENDING_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  WAITING_ACKNOWLEDGE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

interface Props {
  open: boolean;
  onClose: () => void;
  type: DrillDownType;
  title: string;
  dateFrom?: string;
  dateTo?: string;
}

export function DrillDownModal({ open, onClose, type, title, dateFrom, dateTo }: Props) {
  const [tasks, setTasks] = useState<DrillDownTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTasks([]);
    setError(false);
    const params = new URLSearchParams({ type });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fetch(`/api/analytics/drilldown?${params}`)
      .then((r) => r.json())
      .then((d) => { setTasks(d.data ?? []); setTotal(d.total ?? 0); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, type, dateFrom, dateTo]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {!loading && tasks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {tasks.length} công việc{total >= 100 ? ' (hiển thị tối đa 100)' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-sm text-red-500">Không thể tải dữ liệu. Vui lòng thử lại.</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Không có dữ liệu</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/80 backdrop-blur">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Công việc</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Assignee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deadline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{task.title}</div>
                      {task.taskCode && (
                        <div className="text-[11px] font-mono text-indigo-500 mt-0.5">{task.taskCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-[11px] font-medium', STATUS_STYLE[task.status] ?? 'bg-gray-100 text-gray-600')}>
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {task.assigneeNames.length > 0 ? task.assigneeNames.join(', ') : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {task.scheduleEnd ? (
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {dayjs(task.scheduleEnd).format('DD/MM/YYYY')}
                          </div>
                          {task.daysOverdue !== undefined && task.daysOverdue > 0 && (
                            <div className="text-[11px] font-semibold text-red-500 mt-0.5">Quá {task.daysOverdue} ngày</div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition-colors"
                        onClick={onClose}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
