'use client';

import { cn } from '@/lib/utils';
import { useAssignableUsers } from '../../hooks/useAssignableUsers';

interface AssigneeSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  currentUserId: string;
  touched: boolean;
}

export function AssigneeSelect({ value, onChange, currentUserId, touched }: AssigneeSelectProps) {
  const { data } = useAssignableUsers();
  const users = data?.data ?? [];
  const hasError = touched && value.filter(Boolean).length === 0;

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          'border rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-44 overflow-y-auto',
          hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600',
        )}
      >
        {users.length === 0 && (
          <p className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">Đang tải...</p>
        )}
        {users.map((u) => {
          const checked = value.includes(u.id);
          return (
            <label
              key={u.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm',
                checked ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(u.id)}
                className="accent-indigo-600 w-3.5 h-3.5"
              />
              <span className={cn('flex-1 truncate', checked ? 'text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
                {u.displayName}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {u.id === currentUserId && (
                  <span className="text-[10px] text-slate-400">(bạn)</span>
                )}
                {u.role.name === 'BOSS' && (
                  <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Boss</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {hasError && (
        <p className="text-xs text-red-500">Phải chọn ít nhất 1 người thực hiện</p>
      )}
      {value.filter(Boolean).length > 0 && (
        <p className="text-[11px] text-indigo-600 font-medium">
          Đã chọn {value.filter(Boolean).length} người
        </p>
      )}
    </div>
  );
}
