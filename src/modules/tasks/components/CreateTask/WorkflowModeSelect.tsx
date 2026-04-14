'use client';

import { Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowModeSelectProps {
  value: 'IMMEDIATE' | 'NEED_APPROVAL';
  onChange: (mode: 'IMMEDIATE' | 'NEED_APPROVAL') => void;
}

export function WorkflowModeSelect({ value, onChange }: WorkflowModeSelectProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['IMMEDIATE', 'NEED_APPROVAL'] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
              active
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30',
            )}
          >
            {mode === 'IMMEDIATE'
              ? <Zap className={cn('w-4 h-4 shrink-0', active ? 'text-amber-500' : 'text-slate-400')} />
              : <ShieldCheck className={cn('w-4 h-4 shrink-0', active ? 'text-indigo-500' : 'text-slate-400')} />
            }
            {mode === 'IMMEDIATE' ? 'Trực tiếp' : 'Phê duyệt'}
          </button>
        );
      })}
    </div>
  );
}
