'use client';

import { CheckCircle, Clock, AlertCircle, XCircle, ArrowRightLeft, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskListKpi } from '../services/analytics.service';

interface TaskListKpiCardsProps {
  kpi: TaskListKpi;
}

const CARDS = [
  { key: 'total',       label: 'Tổng task',        icon: LayoutList,      bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500',  val: 'text-gray-900 dark:text-white' },
  { key: 'completed',   label: 'Hoàn thành',        icon: CheckCircle,     bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', val: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'inProgress',  label: 'Đang thực hiện',   icon: Clock,           bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400',   dot: 'bg-indigo-500',  val: 'text-indigo-700 dark:text-indigo-300'  },
  { key: 'overdue',     label: 'Quá hạn',           icon: AlertCircle,     bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500',   val: 'text-amber-700 dark:text-amber-300'    },
  { key: 'rejected',    label: 'Từ chối',            icon: XCircle,         bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500',     val: 'text-red-700 dark:text-red-300'        },
  { key: 'transferred', label: 'Chuyển giao',        icon: ArrowRightLeft,  bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',   dot: 'bg-violet-500',  val: 'text-violet-700 dark:text-violet-300'  },
] as const;

type KpiKey = (typeof CARDS)[number]['key'];

export function TaskListKpiCards({ kpi }: TaskListKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const value = kpi[c.key as KpiKey];
        return (
          <div
            key={c.key}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm px-4 py-3.5 flex items-start gap-3"
          >
            <div className={cn('p-2 rounded-lg shrink-0', c.bg, c.text)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none truncate mb-1.5">
                {c.label}
              </p>
              <p className={cn('text-2xl font-bold tabular-nums leading-none', c.val)}>
                {value.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className={cn('w-2 h-2 rounded-full mt-1 shrink-0 ml-auto', c.dot)} />
          </div>
        );
      })}
    </div>
  );
}
