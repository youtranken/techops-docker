'use client';

/**
 * Mảnh dùng chung của các trang Cài đặt (preview `settings.html`):
 *  PanelHead (`.sp-h`), SettingsBlock (khối tiêu đề trái / nội dung phải như Hồ sơ), SwitchRow (`.srow` + `.sw`),
 *  Dot (`.stat > .sdot`), Note (`.note`), FormSkeleton, PanelError, NoAccess.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Info, Lock, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/shared/ui/States';
import { cn } from '@/lib/utils';

export function PanelHead({ title, description, tags, actions }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  tags?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start gap-4 max-[680px]:mb-4">
      <div className="min-w-[240px] flex-1">
        <h2 id="set-panel-title" tabIndex={-1} className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-head text-[17px] font-semibold leading-[1.35] tracking-[-.01em] text-ink focus:outline-none">
          {title}
          {tags}
        </h2>
        {description && <p className="m-0 mt-1 max-w-[620px] text-[13px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2 pt-0.5 max-[680px]:w-full max-[680px]:[&>button]:h-11 max-[680px]:[&>button]:flex-1">{actions}</div>}
    </div>
  );
}

/** Nhãn nhỏ cạnh tiêu đề mục (preview `.tagx`) */
export function HeadTag({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-body text-xs font-normal tracking-normal text-ink-3">
      <Icon aria-hidden className="size-[13px]" />{children}
    </span>
  );
}

/** Khối form: tiêu đề + mô tả trái (232px), nội dung phải; ≤860 xếp dọc — cùng kiểu khối Hồ sơ (A3-2). */
export function SettingsBlock({ id, title, description, aside, children, className }: {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={`set-b-${id}`} aria-labelledby={`set-h-${id}`} className={cn('mb-4 rounded-card border border-line bg-surface shadow-v2-1 max-[680px]:mb-3', className)}>
      <div className="grid grid-cols-[minmax(0,232px)_minmax(0,1fr)] gap-x-8 gap-y-3 px-6 py-5 max-[860px]:grid-cols-[minmax(0,1fr)] max-[860px]:gap-3.5 max-[860px]:px-4 max-[860px]:py-[18px]">
        <div>
          <h3 id={`set-h-${id}`} className="m-0 mb-1 font-head text-[15px] font-semibold leading-[1.35] tracking-[-.005em] text-ink">{title}</h3>
          {description && <p className="m-0 text-[13px] leading-normal text-ink-3">{description}</p>}
          {aside && <div className="mt-2 text-xs text-ink-2">{aside}</div>}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** Công tắc chuẩn V2 (preview `.sw`) — nút role="switch" */
export function Switch({ checked, onChange, label, disabled, id, describedBy }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative mt-px h-5 w-9 flex-none cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none',
        checked ? 'bg-primary' : 'bg-line-2',
        'before:absolute before:left-0.5 before:top-0.5 before:size-4 before:rounded-full before:bg-surface before:shadow-[0_1px_2px_rgba(15,23,41,.25)] before:transition-transform dark:before:bg-[#DDE1E8] dark:before:shadow-none motion-reduce:before:transition-none',
        checked && 'before:translate-x-4',
      )}
    />
  );
}

/** Hàng bật/tắt: chữ trái, công tắc phải (preview `.srow`) */
export function SwitchRow({ id, title, hint, checked, onChange, disabled, badge, className }: {
  id: string;
  title: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <div className="min-w-0 flex-1">
        <b id={`${id}-l`} className="block text-sm font-medium text-ink">{title}{badge}</b>
        {hint && <span id={`${id}-d`} className="mt-0.5 block text-xs text-ink-3">{hint}</span>}
      </div>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} label={typeof title === 'string' ? title : ''} describedBy={hint ? `${id}-d` : undefined} />
    </div>
  );
}

/** Thẻ bật/tắt đầu trang (preview `.srow-top`) */
export function MasterSwitch(props: React.ComponentProps<typeof SwitchRow>) {
  return (
    <div className="mb-4 rounded-card border border-line bg-surface px-5 py-4 shadow-v2-1 max-[680px]:mb-3 max-[680px]:px-4 max-[680px]:py-3.5">
      <SwitchRow {...props} />
    </div>
  );
}

export type DotTone = 'done' | 'off' | 'review' | 'progress';
const TONE: Record<DotTone, string> = { done: 'bg-c-done', off: 'bg-c-draft', review: 'bg-c-review', progress: 'bg-c-progress' };
export function Dot({ tone, children, className }: { tone: DotTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 whitespace-nowrap font-body text-[13px] font-normal tracking-normal text-ink-2', className)}>
      <span aria-hidden className={cn('size-2 flex-none rounded-full', TONE[tone])} />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Note({ tone = 'info', children, className, role }: { tone?: 'info' | 'warn' | 'bad'; children: React.ReactNode; className?: string; role?: string }) {
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div
      role={role}
      className={cn(
        'mb-4 flex items-start gap-2.5 rounded-ctl border px-3.5 py-2.5 text-[13px] leading-normal text-ink-2 max-[680px]:mb-3',
        tone === 'info' && 'border-transparent bg-[color-mix(in_srgb,var(--primary-soft)_60%,var(--surface))]',
        tone === 'warn' && 'border-transparent bg-[color-mix(in_srgb,var(--c-review)_11%,var(--surface))]',
        tone === 'bad' && 'border-transparent bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))]',
        className,
      )}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-4 flex-none', tone === 'info' ? 'text-primary-text' : tone === 'warn' ? 'text-c-review' : 'text-danger')} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Lỗi tải: form bị khoá để không lưu đè cấu hình đang dùng (preview `set.err.*`) */
export function PanelError({ list, onRetry }: { list?: boolean; onRetry: () => void }) {
  const t = useTranslations();
  return (
    <Note tone="bad" role="alert">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1">
          <b className="font-medium text-ink">{t(list ? 'set.err.listT' : 'set.err.formT')}</b><br />
          {t(list ? 'set.err.listD' : 'set.err.formD')}
        </span>
        <Button type="button" variant="outline" size="xs" onClick={onRetry}><RotateCw aria-hidden />{t('app.retry')}</Button>
      </div>
    </Note>
  );
}

/** Không có quyền (API trả 403) — V1 chỉ quay mãi; V2 nói rõ */
export function NoAccess({ adminOnly }: { adminOnly?: boolean }) {
  const t = useTranslations();
  return (
    <div role="status" className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-14 text-center shadow-v2-1">
      <Lock aria-hidden className="mb-3 size-9 stroke-[1.5] text-ink-3" />
      <b className="mb-1 block text-sm font-medium text-ink">{t('set.na.t')}</b>
      <span className="max-w-[440px] text-[13px] text-ink-3">{t(adminOnly ? 'set.na.dAdmin' : 'set.na.d')}</span>
    </div>
  );
}

export function FormSkeleton({ blocks = 2 }: { blocks?: number }) {
  const t = useTranslations();
  return (
    <div aria-busy="true" data-testid="set-skeleton">
      <span className="sr-only">{t('app.loading')}</span>
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="mb-4 grid grid-cols-[minmax(0,232px)_minmax(0,1fr)] gap-8 rounded-card border border-line bg-surface px-6 py-5 shadow-v2-1 max-[860px]:grid-cols-1 max-[860px]:gap-3.5 max-[860px]:px-4">
          <div className="grid content-start gap-2.5">
            <Skeleton variant="line" className="h-3.5 w-1/2" />
            <Skeleton variant="line" className="w-[85%]" />
          </div>
          <div className="grid content-start gap-2.5">
            <Skeleton variant="line" className="h-9" />
            <Skeleton variant="line" className="h-9 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mã lỗi HTTP gắn vào Error của hook (để biết 403) */
export function httpStatus(err: unknown): number | undefined {
  return (err as { status?: number } | null)?.status;
}
