'use client';

/** Một dòng ở trang Thông báo (preview `.nt-i`): icon loại · tiêu đề + nội dung V1 · nhóm · mã việc · thời gian; chấm chưa đọc = nút đánh dấu đã đọc. */
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationWithTask } from '../../services/notification.service';
import { notificationCategory, notificationHref } from '../../lib/notification-view';
import { NotificationIcon } from '../notification-icon';

interface Props {
  n: NotificationWithTask;
  first: boolean;
  onOpen: (n: NotificationWithTask) => void;
  onMarkRead: (n: NotificationWithTask) => void;
}

const Dot = () => <span aria-hidden className="size-[3px] rounded-full bg-ink-3 opacity-60" />;

export function NotificationRow({ n, first, onOpen, onMarkRead }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const href = notificationHref(n);
  const cat = notificationCategory(n.type);
  const created = new Date(n.createdAt);
  const unread = !n.isRead;

  const body = (
    <>
      <NotificationIcon type={n.type} />
      <div className="min-w-0">
        {unread && <span className="sr-only">{t('nt.unread')}: </span>}
        <p className={cn('m-0 text-sm leading-[1.45] [overflow-wrap:anywhere]', unread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>
          {n.title}
        </p>
        <p className={cn('m-0 mt-0.5 line-clamp-2 text-[13px] leading-[1.45] [overflow-wrap:anywhere] max-[680px]:line-clamp-3', unread ? 'text-ink' : 'text-ink-2')}>
          {n.message}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          {cat && <span>{t(`nt.cat.${cat}`)}</span>}
          {n.task?.taskCode && <>{cat && <Dot />}<span className="font-mono">{n.task.taskCode}</span></>}
          <Dot />
          <time dateTime={created.toISOString()} title={created.toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN')}>
            {formatDistanceToNow(created, { addSuffix: true, locale: locale === 'en' ? enUS : vi })}
          </time>
        </div>
      </div>
    </>
  );
  // vạch ngăn giữa các dòng chỉ chạy từ sau icon (preview `.nt-i+.nt-i .nt-a::before`)
  const rowCls = cn(
    'relative grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-3.5 py-3 pl-5 pr-1 text-inherit no-underline max-[680px]:gap-3 max-[680px]:pl-3.5',
    !first && 'before:absolute before:left-[66px] before:right-0 before:top-0 before:border-t before:border-line max-[680px]:before:left-[58px]',
  );

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_44px] items-center" data-nid={n.id} data-unread={unread || undefined}>
      {href ? (
        <Link
          href={href}
          onClick={() => onOpen(n)}
          className={cn(rowCls, 'hover:bg-surface-2 focus-visible:shadow-[inset_0_0_0_2px_var(--primary)] focus-visible:outline-none')}
        >
          {body}
        </Link>
      ) : (
        <div className={rowCls}>{body}</div>
      )}
      <div className="grid place-items-center self-stretch">
        {unread && (
          <button
            type="button"
            onClick={() => onMarkRead(n)}
            aria-label={t('nt.markRead')}
            title={t('nt.markRead')}
            className="group/b grid size-11 place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden className="size-2 rounded-full bg-primary-text group-hover/b:hidden group-focus-visible/b:hidden" />
            <Check aria-hidden className="hidden size-4 group-hover/b:block group-focus-visible/b:block" />
          </button>
        )}
      </div>
    </li>
  );
}
