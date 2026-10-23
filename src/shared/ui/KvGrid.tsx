/** Lưới nhãn/giá trị kẻ ô 2 cột (preview `dl.kvg`). Ô lẻ cuối cùng tự trải hết hàng. */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface KvItem {
  key?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  /** Dòng nhỏ dưới giá trị */
  hint?: React.ReactNode;
}

export function KvGrid({ items, className }: { items: KvItem[]; className?: string }) {
  const n = items.length;
  return (
    <dl className={cn('m-0 grid grid-cols-2', className)}>
      {items.map((it, i) => {
        const oddLast = i === n - 1 && n % 2 === 1;
        const lastRow = n % 2 === 0 ? i >= n - 2 : i === n - 1;
        return (
          <div
            key={it.key ?? i}
            className={cn(
              'min-w-0 border-line px-4 pb-[11px] pt-2.5 max-[680px]:px-3 max-[680px]:pb-2.5 max-[680px]:pt-[9px]',
              !lastRow && 'border-b',
              i % 2 === 0 && !oddLast && 'border-r',
              oddLast && 'col-span-2',
            )}
          >
            <dt className="mb-1 text-xs leading-4 text-ink-3">{it.label}</dt>
            <dd className="m-0 flex min-h-6 min-w-0 flex-wrap items-center gap-1.5 text-sm text-ink">
              {it.value}
              {it.hint && <small className="basis-full text-xs text-ink-3">{it.hint}</small>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
