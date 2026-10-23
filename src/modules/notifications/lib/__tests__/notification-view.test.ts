import { describe, it, expect } from 'vitest';
import { groupByDay3 } from '../group-by-day';
import {
  NOTIFICATION_TYPES, notificationCategory, notificationHref, feedUrl, nextFeedPage, flattenFeed, FEED_LIMIT,
} from '../notification-view';
import { APP_TIMEZONE } from '@/i18n/format';

const n = (id: string, iso: string) => ({ id, createdAt: iso });

describe('groupByDay3 — trang Thông báo: Hôm nay / Hôm qua / Cũ hơn theo múi giờ app (UTC+7)', () => {
  // 23/10/2026 08:00 giờ VN = 23/10 01:00 UTC
  const now = new Date('2026-10-23T01:00:00Z');

  it('chia theo mốc nửa đêm giờ VN', () => {
    const items = [
      n('a', '2026-10-23T00:30:00Z'), // 07:30 23/10 VN → hôm nay
      n('b', '2026-10-22T17:00:00Z'), // 00:00 23/10 VN → hôm nay
      n('c', '2026-10-22T16:59:59Z'), // 23:59:59 22/10 VN → hôm qua
      n('d', '2026-10-21T17:00:00Z'), // 00:00 22/10 VN → hôm qua
      n('e', '2026-10-21T16:59:59Z'), // 23:59:59 21/10 VN → cũ hơn
      n('f', '2026-09-01T05:00:00Z'),
    ];
    const g = groupByDay3(items, now, APP_TIMEZONE);
    expect(g.today.map((x) => x.id)).toEqual(['a', 'b']);
    expect(g.yesterday.map((x) => x.id)).toEqual(['c', 'd']);
    expect(g.older.map((x) => x.id)).toEqual(['e', 'f']);
  });

  it('qua đầu tháng / đầu năm vẫn đúng "hôm qua"', () => {
    const jan1 = new Date('2027-01-01T02:00:00Z'); // 09:00 01/01/2027 VN
    const g = groupByDay3([n('x', '2026-12-31T10:00:00Z'), n('y', '2026-12-30T10:00:00Z')], jan1);
    expect(g.yesterday.map((x) => x.id)).toEqual(['x']);
    expect(g.older.map((x) => x.id)).toEqual(['y']);
  });

  it('ngày hỏng → Cũ hơn; rỗng → 3 nhóm rỗng', () => {
    expect(groupByDay3([n('z', 'not-a-date')], now).older.map((x) => x.id)).toEqual(['z']);
    expect(groupByDay3([], now)).toEqual({ today: [], yesterday: [], older: [] });
  });
});

describe('nội dung / đường dẫn thông báo', () => {
  it('đủ 14 loại V1 (prisma enum NotificationType), mỗi loại 1 nhóm của preview', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(14);
    const cats = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, notificationCategory(t)]));
    expect(cats).toEqual({
      TASK_ASSIGNED: 'assign', TRANSFER_RECEIVED: 'assign', ALL_FAILED: 'assign',
      PLAN_APPROVAL_REQUESTED: 'approval', TASK_APPROVED: 'approval', TASK_REJECTED: 'approval',
      REVIEW_REQUIRED: 'review', REVISION_REQUIRED: 'review', TASK_COMPLETED: 'review',
      EXTENSION_REQUESTED: 'ext', EXTENSION_APPROVED: 'ext', EXTENSION_REJECTED: 'ext',
      COMMENT_ADDED: 'comment', DEADLINE_REMINDER: 'due',
    });
  });

  it('loại lạ → không có nhóm (không vỡ trang)', () => {
    expect(notificationCategory('SOMETHING_NEW')).toBeNull();
  });

  it('bấm thông báo → /tasks/{task.id} như V1; không có công việc → null', () => {
    expect(notificationHref({ task: { id: 'ck1', title: 'x', taskCode: '26-0001' } })).toBe('/tasks/ck1');
    expect(notificationHref({ task: null })).toBeNull();
  });
});

describe('API danh sách V1 (GET /api/notifications: page, limit ≤50, unreadOnly)', () => {
  it('URL đúng tham số V1', () => {
    expect(FEED_LIMIT).toBe(20);
    expect(feedUrl('all', 1)).toBe('/api/notifications?page=1&limit=20');
    expect(feedUrl('unread', 3)).toBe('/api/notifications?page=3&limit=20&unreadOnly=true');
  });

  it('trang kế: còn thì page+1, hết thì undefined', () => {
    expect(nextFeedPage({ data: [], total: 45, page: 1, limit: 20 })).toBe(2);
    expect(nextFeedPage({ data: [], total: 45, page: 2, limit: 20 })).toBe(3);
    expect(nextFeedPage({ data: [], total: 45, page: 3, limit: 20 })).toBeUndefined();
    expect(nextFeedPage({ data: [], total: 40, page: 2, limit: 20 })).toBeUndefined();
    expect(nextFeedPage({ data: [], total: 0, page: 1, limit: 20 })).toBeUndefined();
  });

  it('gộp các trang, bỏ trùng id (thông báo mới đến làm lệch offset)', () => {
    const p1 = { data: [{ id: 'a' }, { id: 'b' }], total: 4, page: 1, limit: 2 };
    const p2 = { data: [{ id: 'b' }, { id: 'c' }], total: 4, page: 2, limit: 2 };
    expect(flattenFeed([p1, p2]).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(flattenFeed(undefined)).toEqual([]);
  });
});
