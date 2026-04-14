'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { NotificationTypeInfo } from '../types';

interface Props {
  filteredEntries: [string, NotificationTypeInfo][];
  emailTypes: string[];
  toggleType: (type: string) => void;
  toggleAll: (types: string[], checked: boolean) => void;
  readOnly?: boolean;
}

export function NotificationTypeList({ filteredEntries, emailTypes, toggleType, toggleAll, readOnly = false }: Props) {
  const visibleTypeKeys = filteredEntries.map(([k]) => k);
  const allChecked = visibleTypeKeys.length > 0 && visibleTypeKeys.every((k) => emailTypes.includes(k));
  const someChecked = !allChecked && visibleTypeKeys.some((k) => emailTypes.includes(k));
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someChecked;
  }, [someChecked]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2 border-b">
      <label className={cn('flex items-center gap-2.5 select-none', !readOnly && 'cursor-pointer')}>
        <input ref={checkboxRef} type="checkbox" checked={allChecked}
          onChange={(e) => !readOnly && toggleAll(visibleTypeKeys, e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 rounded accent-primary disabled:opacity-50 disabled:cursor-not-allowed" />
        <span className="text-sm font-medium">Chọn tất cả ({visibleTypeKeys.length})</span>
      </label>
        <span className="text-xs text-muted-foreground">
          {emailTypes.filter((t) => visibleTypeKeys.includes(t)).length}/{visibleTypeKeys.length} đã chọn
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {filteredEntries.map(([type, info]) => {
          const checked = emailTypes.includes(type);
          return (
            <label key={type} className={cn(
              'flex items-start gap-3 p-3 rounded-lg border transition-colors select-none',
              readOnly ? 'cursor-default opacity-75' : 'cursor-pointer',
              checked ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/50')}>
              <input type="checkbox" checked={checked} onChange={() => !readOnly && toggleType(type)}
                disabled={readOnly}
                className="mt-0.5 h-4 w-4 rounded accent-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-none">{info.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
              </div>
              <div className="ml-auto shrink-0 flex gap-1">
                {info.roles.map((r) => (
                  <span key={r} className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    r === 'BOSS'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')}>
                    {r === 'BOSS' ? 'QL' : 'NV'}
                  </span>
                ))}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
