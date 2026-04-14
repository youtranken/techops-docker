'use client';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { useOverdueTasks, useWorkloadBalance } from '@/modules/analytics/hooks/useAnalytics';
import { WorkloadChart } from '@/modules/analytics/components/WorkloadChart';

export default function ResearchPage() {
  const { data: overdue = [], isLoading: overdueLoading } = useOverdueTasks();
  const { data: workload = [] } = useWorkloadBalance();

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
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Tasks Quá Hạn ({overdue.length})
        </h3>

        {overdueLoading ? (
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        ) : overdue.length === 0 ? (
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
                {overdue.map((task) => (
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
