'use client';

import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPerformance } from '../services/analytics.service';

interface PerformanceTableProps {
  data: UserPerformance[];
}

const COLS = [
  { key: 'tasksCompleted',  label: 'Hoàn thành',    color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { key: 'inProgress',      label: 'Đang TH',        color: 'text-indigo-600 dark:text-indigo-400',   dot: 'bg-indigo-500'  },
  { key: 'rejectionCount',  label: 'Từ chối',        color: 'text-red-500 dark:text-red-400',         dot: 'bg-red-500'     },
  { key: 'overdueCount',    label: 'Quá hạn',        color: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500'   },
  { key: 'transferredCount',label: 'Chuyển giao',    color: 'text-violet-600 dark:text-violet-400',   dot: 'bg-violet-500'  },
] as const;

type ColKey = (typeof COLS)[number]['key'];

export function PerformanceTable({ data }: PerformanceTableProps) {
  if (data.length === 0) {
    return <div className="text-center py-10 text-gray-400 text-sm">Chưa có dữ liệu</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">

        {/* Header */}
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <th className="text-left pl-3 pr-2 py-2.5 w-8 rounded-l-lg">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">#</span>
            </th>
            <th className="text-left px-2 py-2.5 min-w-[150px]">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nhân viên</span>
            </th>
            <th className="text-center px-3 py-2.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tổng</span>
            </th>
            {COLS.map((col) => (
              <th key={col.key} className="text-center px-3 py-2.5">
                <div className="flex flex-col items-center gap-0.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', col.dot)} />
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wider', col.color)}>
                    {col.label}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.slice(0, 15).map((user, idx) => {
            const completionPct = user.totalAssigned > 0
              ? Math.round((user.tasksCompleted / user.totalAssigned) * 100) : 0;

            return (
              <tr
                key={user.userId}
                className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors"
              >
                {/* Rank */}
                <td className="pl-3 pr-2 py-3 w-8 align-middle">
                  {idx === 0
                    ? <Trophy className="w-4 h-4 text-amber-400" />
                    : <span className="text-xs font-medium text-gray-300 dark:text-gray-600">{idx + 1}</span>}
                </td>

                {/* Name + bar */}
                <td className="px-2 py-3 align-middle">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    {user.displayName}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-20 h-[3px] bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 tabular-nums leading-none">{completionPct}%</span>
                  </div>
                </td>

                {/* Tổng */}
                <td className="px-3 py-3 text-center align-middle">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                    {user.totalAssigned}
                  </span>
                </td>

                {/* Stat columns */}
                {COLS.map((col) => {
                  const val = user[col.key as ColKey];
                  return (
                    <td key={col.key} className="px-3 py-3 text-center align-middle">
                      {val > 0
                        ? <span className={cn('text-sm font-bold tabular-nums', col.color)}>{val}</span>
                        : <span className="text-sm text-gray-200 dark:text-gray-700 tabular-nums font-medium">0</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  );
}
