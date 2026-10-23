'use client';

import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useToggleImportant } from '../../hooks/useTaskTracking';
import { useErrorMessage } from '@/lib/useErrorMessage';

interface Props {
  taskId: string;
  isImportant: boolean;
  /** Chỉ Boss/Admin bấm được; người khác không render nút (nhân viên không thấy ★) */
  canToggle: boolean;
  size?: 'sm' | 'md';
  /** Hiện ☆ mờ khi chưa đánh dấu (vd chỉ hiện khi rê chuột trên thẻ) */
  className?: string;
}

/** V2 — ★ Quan trọng (Boss/Admin, dùng chung) */
export function ImportantStarButton({ taskId, isImportant, canToggle, size = 'sm', className }: Props) {
  const errMsg = useErrorMessage();
  const toggle = useToggleImportant();
  if (!canToggle) return null;

  const iconCls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <button
      type="button"
      title={isImportant ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu quan trọng'}
      aria-pressed={isImportant}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate(
          { id: taskId, isImportant: !isImportant },
          { onError: (err) => toast.error(errMsg(err)) },
        );
      }}
      className={cn(
        'shrink-0 rounded p-0.5 transition-all hover:scale-110 disabled:opacity-50',
        isImportant ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600',
        !isImportant && className,
      )}
    >
      <Star className={cn(iconCls, isImportant && 'fill-current')} />
    </button>
  );
}
