'use client';

import { cn } from '@/lib/utils';
import { useAssignableUsers } from '../../../hooks/useAssignableUsers';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  lockedIds: string[];
  lockedLabels: Record<string, string>;
  currentUserId: string;
  touched: boolean;
}

export function EditTaskAssigneeSelect({ value, onChange, lockedIds, lockedLabels, touched }: Props) {
  const { data } = useAssignableUsers();
  const users = data?.data ?? [];
  const hasError = touched && value.filter(Boolean).length === 0;

  function toggle(id: string) {
    if (lockedIds.includes(id)) return;
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className="space-y-1.5">
      <div className={cn(
        'border rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-44 overflow-y-auto',
        hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600',
      )}>
        {users.length === 0 && <p className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">Đang tải...</p>}
        {users.map((u) => {
          const checked = value.includes(u.id);
          const isLocked = lockedIds.includes(u.id);
          const lockLabel = lockedLabels[u.id];
          return (
            <label
              key={u.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                isLocked ? 'cursor-not-allowed opacity-70 bg-slate-50 dark:bg-slate-800/60' : checked ? 'bg-indigo-50 dark:bg-indigo-900/30 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(u.id)}
                disabled={isLocked}
                className="accent-indigo-600 w-3.5 h-3.5"
              />
              <span className={cn('flex-1 truncate', checked ? 'text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
                {u.displayName}
              </span>
              {lockLabel && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">({lockLabel})</span>
              )}
            </label>
          );
        })}
      </div>
      {hasError && <p className="text-xs text-red-500">Phải chọn ít nhất 1 người thực hiện</p>}
      {value.filter(Boolean).length > 0 && (
        <p className="text-[11px] text-indigo-600 font-medium">Đã chọn {value.filter(Boolean).length} người</p>
      )}
    </div>
  );
}
