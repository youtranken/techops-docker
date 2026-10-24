/**
 * Lọc ngày ở Nhật ký phải theo giờ VN (UTC+7), không theo ngày UTC.
 * Ô ngày gửi 'YYYY-MM-DD' → từ 00:00 VN đến 23:59:59.999 VN của ngày đó.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vnDayStart, vnDayEnd } from '../vn-day-range';

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), taskCount: vi.fn(), taskFindMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    userActivityLog: { findMany: mocks.findMany, count: mocks.count },
    task: { count: mocks.taskCount, findMany: mocks.taskFindMany },
  },
}));

import { userActivityLogService } from '../user-activity-log.service';
import { taskReferenceService } from '../task-reference.service';

describe('vnDayStart / vnDayEnd', () => {
  it('đầu ngày VN = 17:00 UTC hôm trước', () => {
    expect(vnDayStart('2026-10-24').toISOString()).toBe('2026-10-23T17:00:00.000Z');
  });
  it('cuối ngày VN = 16:59:59.999 UTC cùng ngày', () => {
    expect(vnDayEnd('2026-10-24').toISOString()).toBe('2026-10-24T16:59:59.999Z');
  });
  it('nhận Date (route tasks parse new Date("YYYY-MM-DD")) như chuỗi ngày', () => {
    expect(vnDayStart(new Date('2026-10-24')).toISOString()).toBe('2026-10-23T17:00:00.000Z');
    expect(vnDayEnd(new Date('2026-10-24')).toISOString()).toBe('2026-10-24T16:59:59.999Z');
  });
});

describe('services dùng khoảng ngày giờ VN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]); mocks.count.mockResolvedValue(0);
    mocks.taskFindMany.mockResolvedValue([]); mocks.taskCount.mockResolvedValue(0);
  });

  it('nhật ký người dùng: createdAt trong ngày VN', async () => {
    await userActivityLogService.getAll({ dateFrom: '2026-10-24', dateTo: '2026-10-24' });
    const where = mocks.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte.toISOString()).toBe('2026-10-23T17:00:00.000Z');
    expect(where.createdAt.lte.toISOString()).toBe('2026-10-24T16:59:59.999Z');
  });

  it('tra cứu mã: lịch từ đầu ngày VN, lịch đến cuối ngày VN', async () => {
    await taskReferenceService.getAll({ scheduleFrom: '2026-10-20', scheduleTo: '2026-10-24', page: 1, limit: 20 });
    const where = mocks.taskFindMany.mock.calls[0][0].where;
    expect(where.scheduleStart.gte.toISOString()).toBe('2026-10-19T17:00:00.000Z');
    expect(where.scheduleEnd.lte.toISOString()).toBe('2026-10-24T16:59:59.999Z');
  });
});
