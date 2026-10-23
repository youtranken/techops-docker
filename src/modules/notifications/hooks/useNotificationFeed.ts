'use client';

/** Trang /notifications: tải theo trang từ API V1 (GET /api/notifications?page&limit&unreadOnly), "Xem thông báo cũ hơn" = trang kế. */
import { useInfiniteQuery } from '@tanstack/react-query';
import { toApiError } from '@/lib/errors';
import type { NotificationWithTask } from '../services/notification.service';
import { feedUrl, nextFeedPage, type FeedPage, type FeedTab } from '../lib/notification-view';

/** Nằm dưới ['notifications'] → các mutation V1 (đọc 1 / đọc hết) tự làm mới. */
export const feedKey = (tab: FeedTab) => ['notifications', 'feed', tab] as const;

export function useNotificationFeed(tab: FeedTab) {
  return useInfiniteQuery({
    queryKey: feedKey(tab),
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<FeedPage<NotificationWithTask>> => {
      const res = await fetch(feedUrl(tab, pageParam));
      const body = await res.json().catch(() => null);
      if (!res.ok) throw toApiError(body, 'Không tải được thông báo', res.status);
      return body as FeedPage<NotificationWithTask>;
    },
    getNextPageParam: (last) => nextFeedPage(last),
    refetchOnWindowFocus: true,
  });
}
