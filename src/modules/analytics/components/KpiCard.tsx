'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  progress?: number;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';
  /** Delta so với kỳ trước (dương = tăng, âm = giảm) */
  delta?: number;
  /** Click handler — nếu có, card trở thành clickable (drill-down) */
  onClick?: () => void;
}

const theme = {
  blue:   { icon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500',  bar: 'bg-indigo-500',  sub: 'text-indigo-500 dark:text-indigo-400',  ring: 'ring-indigo-500/15'  },
  green:  { icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', bar: 'bg-emerald-500', sub: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/15' },
  orange: { icon: 'bg-amber-400/10 text-amber-600 dark:text-amber-400',   dot: 'bg-amber-400',   bar: 'bg-amber-400',   sub: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-400/15'   },
  red:    { icon: 'bg-red-500/10 text-red-600 dark:text-red-400',         dot: 'bg-red-500',     bar: 'bg-red-500',     sub: 'text-red-500 dark:text-red-400',       ring: 'ring-red-500/15'     },
  purple: { icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', dot: 'bg-violet-500',  bar: 'bg-violet-500',  sub: 'text-violet-600 dark:text-violet-400',  ring: 'ring-violet-500/15'  },
  teal:   { icon: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',      dot: 'bg-teal-500',    bar: 'bg-teal-500',    sub: 'text-teal-600 dark:text-teal-400',     ring: 'ring-teal-500/15'    },
} as const;

export function KpiCard({ title, value, icon: Icon, subtitle, progress, color = 'blue', delta, onClick }: KpiCardProps) {
  const t = theme[color];
  return (
    <div
      className={cn(
        'relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800',
        'shadow-sm ring-1 flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        t.ring,
        onClick && 'cursor-pointer hover:ring-2',
      )}
      onClick={onClick}
      title={onClick ? 'Nhấn để xem chi tiết' : undefined}
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', t.icon)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none truncate mb-2">
            {title}
          </p>
          <p className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-white tabular-nums leading-none">
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
          </p>
          {subtitle && (
            <p className={cn('text-[11px] font-medium mt-1.5 leading-none truncate', t.sub)}>
              {subtitle}
            </p>
          )}
          {delta !== undefined && delta !== 0 && (
            <div className={cn('flex items-center gap-0.5 mt-1', delta > 0 ? 'text-emerald-600' : 'text-red-500')}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-[11px] font-semibold">{delta > 0 ? '+' : ''}{delta}</span>
            </div>
          )}
        </div>
        <div className={cn('w-2 h-2 rounded-full mt-1 shrink-0', t.dot)} />
      </div>

      {progress !== undefined && (
        <div className="mt-auto">
          <div className="h-[3px] bg-gray-100 dark:bg-gray-800">
            <div className={cn('h-full transition-all duration-700 ease-out', t.bar)}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
