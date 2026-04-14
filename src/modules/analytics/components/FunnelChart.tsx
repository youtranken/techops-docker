'use client';

import type { FunnelStage } from '../services/analytics.service';
import { cn } from '@/lib/utils';

interface FunnelChartProps {
  data: FunnelStage[];
}

const STAGE_COLORS = [
  'bg-indigo-500',   // Tạo mới
  'bg-blue-500',    // Đã tiếp nhận
  'bg-amber-500',   // Đang thực hiện (cam)
  'bg-violet-500',  // Chờ Review (tím)
  'bg-emerald-500', // Hoàn thành
];

const STAGE_TEXT_COLORS = [
  'text-indigo-700 dark:text-indigo-300',
  'text-blue-700 dark:text-blue-300',
  'text-amber-700 dark:text-amber-300',  // cam
  'text-violet-700 dark:text-violet-300', // tím
  'text-emerald-700 dark:text-emerald-300',
];

export function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0 || data[0].count === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
        Chưa có dữ liệu
      </div>
    );
  }

  const maxCount = data[0].count;

  return (
    <div className="space-y-3">
      {data.map((stage, i) => {
        const barWidth = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;


        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-sm font-medium', STAGE_TEXT_COLORS[i])}>
                {stage.label}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {stage.count.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 w-10 text-right">
                  {stage.percentage}%
                </span>
              </div>
            </div>
            <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', STAGE_COLORS[i])}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
