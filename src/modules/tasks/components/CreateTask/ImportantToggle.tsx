'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportantToggleProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

/** V2 — ★ Đánh dấu quan trọng (chỉ hiển thị cho Boss/Admin) — dùng ở form Tạo và Sửa */
export function ImportantToggle({ checked, onCheckedChange }: ImportantToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      aria-pressed={checked}
      className={cn(
        'w-full flex items-center justify-between rounded-lg border px-4 py-3 transition-all',
        checked
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
          checked ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700',
        )}>
          <Star className={cn('w-3.5 h-3.5', checked ? 'text-amber-500 fill-current' : 'text-slate-400')} />
        </div>
        <div className="text-left">
          <p className={cn('text-sm font-medium', checked ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-300')}>
            Đánh dấu quan trọng
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Hiện trong mục ★ Quan trọng ở sidebar để dễ theo dõi</p>
        </div>
      </div>
      <div className={cn('relative w-10 h-5.5 rounded-full transition-colors shrink-0', checked ? 'bg-amber-500' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </div>
    </button>
  );
}
