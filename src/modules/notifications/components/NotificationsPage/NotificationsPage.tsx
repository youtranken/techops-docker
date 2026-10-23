'use client';

/**
 * Trang /notifications (preview `notifications.html`) — chỉ dùng API V1 sẵn có:
 *  - tab Tất cả / Chưa đọc = tham số `unreadOnly`; "Xem thông báo cũ hơn" = trang kế (20/trang).
 *  - bấm dòng có công việc → đánh dấu đã đọc + mở /tasks/{id} (như dropdown V1); nút chấm = đánh dấu 1; "Đánh dấu tất cả đã đọc" = read-all.
 * Lọc theo loại thông báo của preview cần API mới → Phase B (không hiện).
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, CheckCheck, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState } from '@/shared/ui/States';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useNotificationCount, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useNotifications';
import { useNotificationFeed } from '../../hooks/useNotificationFeed';
import { flattenFeed, type FeedTab } from '../../lib/notification-view';
import { NotificationGroups, FeedSkeleton } from './NotificationGroups';

export function NotificationsPage() {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const [tab, setTab] = useState<FeedTab>('all');
  const feed = useNotificationFeed(tab);
  const allFeed = useNotificationFeed('all'); // tổng cho tab Tất cả (cùng khoá với tab Tất cả → không gọi thừa)
  const { data: unread = 0, isSuccess: countOk } = useNotificationCount();
  const markRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();

  const items = flattenFeed(feed.data?.pages);
  const total = allFeed.data?.pages[0]?.total;
  const failed = feed.isError && !feed.data;

  function readAll() {
    const n = unread;
    markAll.mutate(undefined, {
      onSuccess: () => toast.success(t('nt.readAllDone', { n })),
      onError: (e) => toast.error(errMsg(e)),
    });
  }

  async function more() {
    const r = await feed.fetchNextPage();
    if (r.isError) toast.error(t('ntx.loadMoreErr'));
  }

  return (
    <div className="max-w-[960px]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('nt.title')}</h1>
          <p className="m-0 mt-1 min-h-5 text-[13px] text-ink-3" data-testid="nt-sub">
            {countOk ? (unread ? t('nt.sub', { n: unread }) : t('nt.subNone')) : ' '}
          </p>
        </div>
        <Button type="button" variant="outline" size="md" onClick={readAll} disabled={!unread || markAll.isPending} className="max-[680px]:h-11">
          <CheckCheck aria-hidden />
          {t('nt.readAll')}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FeedTab)} className="mb-4">
        <TabsList aria-label={t('nt.list')}>
          <TabsTrigger value="all" count={total} className="max-[680px]:h-11">{t('nt.tab.all')}</TabsTrigger>
          <TabsTrigger value="unread" count={countOk ? unread : undefined} className="max-[680px]:h-11">{t('nt.tab.unread')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div
        aria-live="polite"
        aria-busy={feed.isLoading || undefined}
        className="overflow-hidden rounded-card border border-line bg-surface shadow-v2-1"
        data-testid="nt-box"
      >
        {feed.isLoading ? (
          <FeedSkeleton />
        ) : failed ? (
          <ErrorState title={t('nt.err.t')} description={t('nt.err.d')} onRetry={() => feed.refetch()} />
        ) : items.length === 0 ? (
          tab === 'unread'
            ? <EmptyState icon={CheckCircle2} title={t('nt.empty.unread.t')} description={t('nt.empty.unread.d')} />
            : <EmptyState icon={Bell} title={t('nt.empty.all.t')} description={t('nt.empty.all.d')} />
        ) : (
          <>
            <NotificationGroups
              items={items}
              onOpen={(n) => { if (!n.isRead) markRead.mutate(n.id); }}
              onMarkRead={(n) => markRead.mutate(n.id)}
            />
            <div className="flex justify-center border-t border-line p-2.5 text-[13px] text-ink-3">
              {feed.hasNextPage ? (
                <Button type="button" variant="subtle" size="xs" onClick={more} disabled={feed.isFetchingNextPage} className="max-[680px]:h-11" data-testid="nt-more">
                  {feed.isFetchingNextPage ? <Loader2 aria-hidden className="animate-spin" /> : <ChevronDown aria-hidden />}
                  {t('nt.more')}
                </Button>
              ) : (
                <span data-testid="nt-end">{t('nt.end')}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
