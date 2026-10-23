'use client';

/** Nội dung dropdown chuông (preview `.pop-h .pop-g .n-item .pop-note .pop-f`). Nhóm Hôm nay / Trước đó theo múi giờ app; chân có "Xem tất cả" → /notifications (A3-2). */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BellOff, Info } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/States';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { groupByDay } from '../lib/group-by-day';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  /** id chưa đọc lúc mở chuông (V1 đánh dấu đọc hết ngay khi mở) */
  unreadIds: ReadonlySet<string>;
  /** ghi chú cho Admin (V1 `_shared.ts`: Admin không nhận email việc) */
  showAdminNote?: boolean;
  onNavigate?: () => void;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3.5 pb-1 pt-2 text-xs font-medium text-ink-3">{children}</div>;
}

export function NotificationDropdown({ unreadIds, showAdminNote, onNavigate }: NotificationDropdownProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data: notifications = [], isLoading, isError, refetch, isFetching } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadNow = notifications.filter((n) => !n.isRead).length;
  const { today, earlier } = groupByDay(notifications, new Date());

  function handleItemClick(id: string, taskId?: string | null) {
    markAsRead.mutate(id);
    if (taskId) {
      onNavigate?.();
      router.push(`/tasks/${taskId}`);
    }
  }

  const list = (items: typeof notifications) =>
    items.map((n) => (
      <NotificationItem
        key={n.id}
        notification={n}
        unread={!n.isRead || unreadIds.has(n.id)}
        onClick={() => handleItemClick(n.id, n.task?.id)}
      />
    ));

  return (
    <div className="flex max-h-[min(560px,calc(100dvh-80px))] flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3.5 pb-2 pt-3">
        <h3 id="notif-pop-title" className="m-0 font-head text-[15px] font-semibold leading-snug text-ink">
          {t('notif.title')}
        </h3>
        {unreadNow > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="ml-auto rounded-sm px-1.5 py-1 text-[13px] font-medium text-primary-text hover:bg-surface-2 disabled:opacity-50"
          >
            {t('notif.readAll')}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-1" aria-busy={isLoading}>
        {isLoading ? (
          <div className="space-y-1 px-3.5 py-2" aria-label={t('app.loading')}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2.5 py-2">
                <Skeleton variant="circle" className="size-8 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton variant="line" className="w-4/5" />
                  <Skeleton variant="line" className="w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState title={t('notif.loadFailed')} onRetry={() => refetch()} className="py-8" />
        ) : notifications.length === 0 ? (
          <EmptyState icon={BellOff} title={t('notif.empty')} description={t('notif.emptyD')} className="py-8" />
        ) : (
          <>
            {today.length > 0 && (
              <section aria-label={t('notif.today')}>
                <GroupLabel>{t('notif.today')}</GroupLabel>
                {list(today)}
              </section>
            )}
            {earlier.length > 0 && (
              <section aria-label={t('notif.earlier')}>
                <GroupLabel>{t('notif.earlier')}</GroupLabel>
                {list(earlier)}
              </section>
            )}
          </>
        )}
        {showAdminNote && !isLoading && (
          <p className="mx-3.5 mb-2 mt-1 flex items-start gap-1.5 rounded-ctl bg-surface-2 px-2.5 py-2 text-xs text-ink-2">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
            <span>{t('notif.adminNoMail')}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 justify-center border-t border-line px-3.5 py-1.5">
        <Link
          href="/notifications"
          onClick={onNavigate}
          aria-label={t('ntx.allLabel')}
          className="inline-flex min-h-9 items-center rounded-sm px-2 text-[13px] font-medium text-primary-text hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('notif.all')}
        </Link>
      </div>
      {isFetching && !isLoading && <span className="sr-only">{t('app.loading')}</span>}
    </div>
  );
}
