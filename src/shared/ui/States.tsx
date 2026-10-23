/** Trạng thái rỗng / lỗi / đang tải (preview `.state`, `.state.bad`, `.sk`). */
import * as React from 'react';
import { Inbox, AlertTriangle, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IconType = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

export interface EmptyStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: IconType;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  const t = useTranslations();
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <Icon aria-hidden className="mb-3 size-9 stroke-[1.5] text-ink-3" />
      <b className="mb-1 block text-sm font-medium text-ink">{title ?? t('ui.noData')}</b>
      {description && <span className="max-w-[440px] text-[13px] text-ink-3">{description}</span>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export function ErrorState({ title, description, onRetry, retryText, className }: ErrorStateProps) {
  const t = useTranslations();
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <AlertTriangle aria-hidden className="mb-3 size-9 stroke-[1.5] text-danger" />
      <b className="mb-1 block text-sm font-medium text-ink">{title ?? t('ui.loadFailed')}</b>
      {description && <span className="max-w-[440px] text-[13px] text-ink-3">{description}</span>}
      {onRetry && (
        <div className="mt-5">
          <Button type="button" variant="outline" size="md" onClick={onRetry}>
            <RotateCw aria-hidden />
            {retryText ?? t('app.retry')}
          </Button>
        </div>
      )}
    </div>
  );
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'line' | 'circle' | 'block';
}

/** Khối xám nhấp nháy; truyền width/height bằng className hoặc style để đúng hình nội dung thật. */
export function Skeleton({ variant = 'block', className, ...props }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'block animate-pulse bg-surface-2 motion-reduce:animate-none',
        variant === 'line' && 'h-3 rounded-sm',
        variant === 'circle' && 'rounded-full',
        variant === 'block' && 'rounded-sm',
        className,
      )}
      {...props}
    />
  );
}
