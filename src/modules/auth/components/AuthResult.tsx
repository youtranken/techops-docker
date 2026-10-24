'use client';

/** Màn kết quả trong thẻ xác thực (preview `.au-res`): icon tròn theo sắc thái + tiêu đề + mô tả + nút. */
import Link from 'next/link';
import { cn } from '@/lib/utils';

const TONE = {
  ok: 'text-c-done bg-[color-mix(in_srgb,var(--c-done)_12%,var(--surface))]',
  bad: 'text-danger bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))]',
  warn: 'text-c-review bg-[color-mix(in_srgb,var(--c-review)_12%,var(--surface))]',
  busy: 'bg-surface-2',
} as const;

export function AuthResult({ tone, icon: Icon, title, desc, children, testId }: {
  tone: keyof typeof TONE;
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  desc?: React.ReactNode;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="px-0 pb-1 pt-2 text-center" data-testid={testId} data-tone={tone}>
      <div className={cn('mx-auto mb-[18px] grid size-[52px] place-items-center rounded-full', TONE[tone])}>
        {tone === 'busy'
          ? <span aria-hidden className="size-8 animate-spin rounded-full border-[3px] border-primary/35 border-t-primary" />
          : Icon && <Icon aria-hidden className="size-6" />}
      </div>
      <h1 id="auT" tabIndex={-1} className="m-0 mb-1.5 font-head text-xl font-semibold leading-[1.3] tracking-[-.015em] text-ink outline-none">{title}</h1>
      {desc && <p className="mx-auto my-0 max-w-[320px] text-sm text-ink-2">{desc}</p>}
      {children && <div className="mt-6 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

const BTN = 'inline-flex h-[42px] max-[680px]:h-11 w-full items-center justify-center gap-2 rounded-md px-[18px] text-sm font-medium no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60';
export const btnPrimary = cn(BTN, 'bg-primary-fill text-primary-fill-ink hover:bg-primary-fill-hover');
export const btnOutline = cn(BTN, 'border border-line bg-surface text-ink hover:border-line-2 hover:bg-surface-2');

export function ResultLink({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return <Link href={href} className={primary ? btnPrimary : btnOutline}>{children}</Link>;
}
