'use client';

/** Một dòng thông báo (preview `.n-item`, chấm chưa đọc bên phải). Icon theo loại thông báo như V1. */
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import type { NotificationWithTask } from '../services/notification.service';
import { NotificationIcon } from './notification-icon';

interface NotificationItemProps {
  notification: NotificationWithTask;
  unread: boolean;
  onClick: () => void;
}

export function NotificationItem({ notification, unread, onClick }: NotificationItemProps) {
  const locale = useLocale();
  const taskCode = notification.task?.taskCode;
  const created = new Date(notification.createdAt);

  return (
    <button
      type="button"
      onClick={onClick}
      data-unread={unread || undefined}
      className="relative flex w-full gap-2.5 border-0 bg-transparent px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
    >
      <NotificationIcon type={notification.type} />
      <span className={cn('min-w-0 flex-1', unread && 'pr-4')}>
        <span className={cn('block text-[13px] leading-snug', unread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>
          {notification.title}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[1.45] text-ink-2">{notification.message}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
          {taskCode && <span className="font-mono text-ink-2">{taskCode}</span>}
          <time dateTime={created.toISOString()}>
            {formatDistanceToNow(created, { addSuffix: true, locale: locale === 'en' ? enUS : vi })}
          </time>
        </span>
      </span>
      {unread && <span aria-hidden className="absolute right-3.5 top-4 size-2 rounded-full bg-primary-text" />}
    </button>
  );
}
