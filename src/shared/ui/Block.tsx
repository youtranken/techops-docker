/** Khối có khung (preview `.blk > .blk-h + .blk-b`) và thẻ đơn giản (`.card .card-h .card-b`). */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BlockProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  count?: React.ReactNode;
  /** Chữ phụ nhỏ bên phải tiêu đề */
  aux?: React.ReactNode;
  /** Nút/hành động góc phải */
  actions?: React.ReactNode;
  /** Thân không đệm (bảng, lưới kv) */
  flush?: boolean;
  /** Tiêu đề h2 hay h3 */
  level?: 2 | 3;
  tone?: 'default' | 'bad';
  bodyClassName?: string;
}

export function Block({
  title, icon: Icon, count, aux, actions, flush, level = 2, tone = 'default', className, bodyClassName, children, ...props
}: BlockProps) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <section className={cn('min-w-0 rounded-card border border-line bg-surface shadow-v2-1', className)} {...props}>
      <header className="flex min-h-11 items-center gap-2 border-b border-line px-4 py-2.5 max-[680px]:px-3.5">
        {Icon && <Icon className={cn('size-4 flex-none', tone === 'bad' ? 'text-danger' : 'text-ink-3')} />}
        <H className="m-0 font-head text-sm font-semibold leading-[1.3] text-ink">{title}</H>
        {count !== undefined && <span className="font-mono text-xs font-medium text-ink-3">{count}</span>}
        {(aux || actions) && (
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {aux && <span className="min-w-0 truncate text-xs text-ink-3">{aux}</span>}
            {actions}
          </div>
        )}
      </header>
      <div
        className={cn(
          'min-w-0',
          flush ? 'p-0' : 'px-4 pb-4 pt-3.5 max-[680px]:px-3.5 max-[680px]:pb-3.5 max-[680px]:pt-3',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export interface CardProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Thẻ đơn giản: tiêu đề không kẻ vạch dưới. */
export function Card({ title, actions, className, children }: CardProps) {
  return (
    <section className={cn('rounded-card border border-line bg-surface shadow-v2-1', className)}>
      {(title || actions) && (
        <header className="flex items-center gap-2 px-4 pt-3">
          {title && <h2 className="m-0 font-head text-sm font-semibold leading-[1.3]">{title}</h2>}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="px-4 pb-3.5 pt-3">{children}</div>
    </section>
  );
}
