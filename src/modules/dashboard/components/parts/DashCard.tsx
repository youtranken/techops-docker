'use client';

/** Khung khối của Tổng quan (preview `.card` + `.card-h` + `.csub`) và các mảnh dùng chung trong khối. */
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface DashCardProps {
  id: string;
  title: React.ReactNode;
  count?: number | null;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function DashCard({ id, title, count, sub, right, className, children }: DashCardProps) {
  return (
    <section
      aria-labelledby={id}
      data-card={id}
      className={cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-v2-1', className)}
    >
      <header className="flex min-h-[34px] flex-wrap items-center gap-x-2 px-4 pt-3 max-[680px]:px-3.5">
        <h2 id={id} className="m-0 whitespace-nowrap font-head text-sm font-semibold leading-[1.3] text-ink">{title}</h2>
        {count ? <span className="font-mono text-xs font-medium text-ink-3" data-testid={`${id}-count`}>{count}</span> : null}
        {right && <div className="ml-auto flex flex-none items-center gap-2">{right}</div>}
      </header>
      {sub && <p className="m-0 px-4 pt-0.5 text-xs leading-5 text-ink-3 max-[680px]:px-3.5">{sub}</p>}
      {children}
    </section>
  );
}

/** "Xem tất cả" (preview `.btn-link.hl`) — chạm 44px ở mobile. */
export function AllLink({ href }: { href: string }) {
  const t = useTranslations();
  return (
    <Link
      href={href}
      className="-mr-1.5 inline-flex h-8 items-center rounded-md px-1.5 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11"
    >
      {t('db.all')}
    </Link>
  );
}

/** Trạng thái rỗng trong khối (preview `.card .state`). */
export function CardEmpty({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-7 text-center">
      <Icon aria-hidden className="mb-2.5 size-7 stroke-[1.5] text-ink-3" />
      <span className="text-[13px] text-ink-2">{text}</span>
    </div>
  );
}

/** Dòng trong danh sách khối (preview `.li`): [tiêu đề | hạn] / [meta | phụ]. */
export interface RowProps {
  onOpen: () => void;
  title: string;
  lead?: React.ReactNode;
  right?: React.ReactNode;
  meta?: React.ReactNode;
  aux?: React.ReactNode;
  hint?: string;
  testId?: string;
}

export function Row({ onOpen, title, lead, right, meta, aux, hint, testId }: RowProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={hint}
      data-testid={testId}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-[3px] border-0 border-t border-line bg-transparent px-4 py-2.5 text-left text-sm text-ink first:border-t-0 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-[680px]:px-3.5"
    >
      <span className="flex min-w-0 items-center gap-[7px]">
        {lead}
        <span className="truncate font-medium leading-5">{title}</span>
      </span>
      <span className="whitespace-nowrap text-right text-xs">{right}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-xs leading-[18px] text-ink-3 [&>*]:flex-none">{meta}</span>
      <span className="flex items-center justify-end whitespace-nowrap text-xs text-ink-3">{aux}</span>
    </button>
  );
}

export const Sep = () => <span aria-hidden>·</span>;

export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 py-1">{children}</div>;
}
