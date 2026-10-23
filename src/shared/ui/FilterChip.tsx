'use client';

/** Chip bộ lọc đang áp (preview `.fchip`): "Nhãn: giá trị ✕". */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  value: React.ReactNode;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1 rounded-pill border border-line-2 bg-surface pl-2.5 pr-1 text-[13px] text-ink', className)}>
      <b className="font-medium text-ink-2">{label}:</b>
      <span>{value}</span>
      <button
        type="button"
        aria-label={`Bỏ lọc ${label}`}
        onClick={onRemove}
        className="grid size-[22px] place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}
