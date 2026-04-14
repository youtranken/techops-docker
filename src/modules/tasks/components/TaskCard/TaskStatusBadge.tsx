import { Badge } from '@/components/ui/badge';
import type { TaskStatus } from '@prisma/client';

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:               { label: 'Nháp',          className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600' },
  PENDING_APPROVAL:    { label: 'Chờ Duyệt',      className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700/50' },
  WAITING_ACKNOWLEDGE: { label: 'Chờ Tiếp Nhận', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700/50' },
  IN_PROGRESS:         { label: 'Đang Làm',       className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50' },
  PENDING_REVIEW:      { label: 'Chờ Review',     className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700/50' },
  COMPLETED:           { label: 'Hoàn Thành',     className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700/50' },
  CANCELLED:           { label: 'Đã Hủy',         className: 'bg-slate-100 text-slate-500 border-slate-200 line-through dark:bg-slate-700/50 dark:text-slate-500 dark:border-slate-600' },
} as const;

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

export function TaskStatusBadge({ status, size = 'md' }: TaskStatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  };
  return (
    <Badge
      variant="outline"
      className={`${className} ${size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-xs'}`}
    >
      {label}
    </Badge>
  );
}

