/** Cờ ưu tiên + chữ (preview `.pr .pr-<tone>`). Tông suy từ `level` của bảng Priority; tên lấy từ DB. */
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { priorityTone, PRIORITY_TONE_META } from './status-meta';

export interface PriorityFlagProps {
  level?: number | null;
  /** Tên mức ưu tiên (bảng Priority); mặc định nhãn theo tông */
  name?: string;
  /** Chỉ hiện cờ (chữ thành sr-only) */
  iconOnly?: boolean;
  className?: string;
}

export function PriorityFlag({ level, name, iconOnly, className }: PriorityFlagProps) {
  const tone = priorityTone(level);
  const meta = PRIORITY_TONE_META[tone];
  const label = name ?? meta.label;
  return (
    <span
      data-tone={tone}
      className={cn('inline-flex items-center gap-1 whitespace-nowrap text-[13px]', meta.strong && 'font-medium', tone === 'low' && 'opacity-70', className)}
      style={{ color: meta.color }}
      title={iconOnly ? label : undefined}
    >
      <Flag aria-hidden className="size-[13px] flex-none" fill={meta.strong ? 'currentColor' : 'none'} />
      <span className={cn(iconOnly && 'sr-only')}>{label}</span>
    </span>
  );
}
