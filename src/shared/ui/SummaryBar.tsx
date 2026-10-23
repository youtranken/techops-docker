/** Thanh tóm tắt (preview `.td-sum`): ô nhãn/giá trị kẻ dọc, 6 → 3 (≤1100) → 2 cột (≤680). */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SummaryItem {
  key?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

export interface SummaryBarProps {
  items: SummaryItem[];
  className?: string;
  ariaLabel?: string;
}

export function SummaryBar({ items, className, ariaLabel = 'Tóm tắt' }: SummaryBarProps) {
  return (
    <section aria-label={ariaLabel} className={cn('overflow-hidden rounded-card border border-line bg-surface shadow-v2-1', className)}>
      <dl className="m-0 grid grid-cols-6 gap-px bg-line max-[1100px]:grid-cols-3 max-[680px]:grid-cols-2">
        {items.map((it, i) => (
          <div key={it.key ?? i} className="min-w-0 bg-surface px-4 pb-[13px] pt-3 max-[680px]:px-3.5 max-[680px]:pb-[11px] max-[680px]:pt-2.5">
            <dt className="mb-1 text-xs leading-4 text-ink-3">{it.label}</dt>
            <dd className="m-0 flex min-h-6 min-w-0 flex-wrap items-center gap-1.5 text-sm text-ink">
              {it.value}
              {it.hint && <small className="basis-full text-xs text-ink-3">{it.hint}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
