/** Một khối của trang Hồ sơ (preview `.pf-card .pf-sec`): tiêu đề + mô tả bên trái (232px), nội dung bên phải; ≤860 xếp dọc. */
import * as React from 'react';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ProfileSection({ id, title, description, children, className }: Props) {
  return (
    <section
      id={`pf-b-${id}`}
      aria-labelledby={`pf-h-${id}`}
      className={cn('mb-4 rounded-card border border-line bg-surface shadow-v2-1 max-[680px]:mb-3', className)}
    >
      <div className="grid grid-cols-[minmax(0,232px)_minmax(0,1fr)] gap-x-8 gap-y-3 px-6 py-5 max-[860px]:grid-cols-[minmax(0,1fr)] max-[860px]:gap-3.5 max-[860px]:px-4 max-[860px]:py-[18px]">
        <div>
          <h2 id={`pf-h-${id}`} tabIndex={-1} className="m-0 mb-1 font-head text-[15px] font-semibold leading-[1.35] tracking-[-.005em] text-ink focus:outline-none">
            {title}
          </h2>
          {description && <p className="m-0 text-[13px] leading-normal text-ink-3">{description}</p>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
