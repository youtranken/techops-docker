'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useOverdueTasks, useWorkloadBalance } from '@/modules/analytics/hooks/useAnalytics';
import { WorkloadChart } from '@/modules/analytics/components/WorkloadChart';
import { DateRangeFilter, type DateRange } from '@/modules/analytics/components/DateRangeFilter';

export default function ResearchPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ dateFrom: '', dateTo: '' });
  const filters = useMemo(
    () => ({ dateFrom: dateRange.dateFrom || undefined, dateTo: dateRange.dateTo || undefined }),
    [dateRange.dateFrom, dateRange.dateTo],
  );
  const { data: overdue = [], isLoading: overdueLoading } = useOverdueTasks(filters);
  const { data: workload = [] } = useWorkloadBalance();
  const [search, setSearch] = useState('');
  const [minDays, setMinDays] = useState('');

  const filteredOverdue = useMemo(() => {
    let items = overdue;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.assignees.some((a) => a.user.displayName.toLowerCase().includes(q)),
      );
    }
    if (minDays && Number(minDays) > 0) {
      items = items.filter((t) => t.daysOverdue >= Number(minDays));
    }
    return items;
  }, [overdue, search, minDays]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Research & Bottlenecks</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Phân tích điểm nghẽn và cân bằng workload
        </p>
      </div>

      {/* Overdue Tasks */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Tasks Quá Hạn ({filteredOverdue.length}{filteredOverdue.length !== overdue.length ? `/${overdue.length}` : ''})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm task, assignee..."
                className="pl-8 h-8 text-sm w-44"
              />
            </div>
            <Input
              type="number"
              min="0"
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              placeholder="Quá hạn ≥ N ngày"
              className="h-8 text-sm w-36"
            />
          </div>
        </div>

        {overdueLoading ? (
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        ) : filteredOverdue.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            🎉 Không có task nào quá hạn!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Task</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Deadline</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Quá hạn</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assignees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredOverdue.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                        {task.title}
                      </p>
                      {task.priority && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.priority.color }}
                          />
                          {task.priority.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{task.status}</td>
                    <td className="px-4 py-3 text-red-600 dark:text-red-400 whitespace-nowrap">
                      {format(new Date(task.scheduleEnd), 'dd/MM/yyyy', { locale: vi })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 dark:text-red-400 font-semibold">
                        +{task.daysOverdue} ngày
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {task.assignees.map((a) => a.user.displayName).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workload Balance */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Phân Bố Workload Hiện Tại
        </h3>
        <WorkloadChart data={workload} />
      </div>
    </div>
  );
}
