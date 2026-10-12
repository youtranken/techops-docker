/**
 * Tests cho task-query.service.list — V2 ★ quan trọng + "Hoàn thành – chưa xem"
 *
 * - EMPLOYEE: hành vi cũ (ẩn Hoàn thành/Hủy), KHÔNG thấy ★, bộ lọc important/unseen bị bỏ qua
 * - BOSS/ADMIN: "Chưa hoàn thành" gồm cả task hoàn thành chưa xem; lọc ★ / chưa xem;
 *   sort mặc định (không truyền sortField) = chưa xem → ★ → mức ưu tiên
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findMany, count, getUnseenTaskIds } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  getUnseenTaskIds: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findMany, count },
    comment: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock('../task-tracking.service', async (orig) => ({
  ...(await orig<typeof import('../task-tracking.service')>()),
  taskTrackingService: { getUnseenTaskIds },
}));

vi.mock('../task-detail.service', () => ({ taskDetailService: { getById: vi.fn() } }));

import { taskQueryService } from '../task-query.service';

const boss = { id: 'boss-1', displayName: 'Boss', role: { name: 'BOSS' } };
const emp = { id: 'emp-1', displayName: 'Emp', role: { name: 'EMPLOYEE' } };

const row = (id: string, extra: Record<string, unknown> = {}) => ({ id, isImportant: false, status: 'IN_PROGRESS', ...extra });
const whereOf = (call = 0) => JSON.stringify(findMany.mock.calls[call][0].where);

beforeEach(() => {
  vi.clearAllMocks();
  getUnseenTaskIds.mockResolvedValue([]);
  findMany.mockResolvedValue([]);
  count.mockResolvedValue(0);
});

describe('EMPLOYEE', () => {
  it('mặc định ẩn Hoàn thành + Hủy như cũ, không gọi getUnseenTaskIds', async () => {
    await taskQueryService.list({ hideCompleted: true, sortField: 'createdAt', sortOrder: 'desc' }, emp);
    expect(whereOf()).toContain('"notIn":["COMPLETED","CANCELLED"]');
    expect(getUnseenTaskIds).not.toHaveBeenCalled();
  });

  it('không thấy ★: isImportant luôn false, isUnseen false', async () => {
    findMany.mockResolvedValueOnce([row('t1', { isImportant: true })]);
    count.mockResolvedValueOnce(1);
    const res = await taskQueryService.list({}, emp);
    expect(res.data[0].isImportant).toBe(false);
    expect(res.data[0].isUnseen).toBe(false);
  });

  it('bộ lọc important / unseenOnly bị bỏ qua', async () => {
    await taskQueryService.list({ important: true, unseenOnly: true, sortField: 'createdAt' }, emp);
    expect(whereOf()).not.toContain('isImportant');
  });
});

describe('BOSS / ADMIN', () => {
  it('"Chưa hoàn thành" = chưa kết thúc HOẶC hoàn thành chưa xem', async () => {
    getUnseenTaskIds.mockResolvedValue(['u1']);
    await taskQueryService.list({ hideCompleted: true, sortField: 'createdAt', sortOrder: 'desc' }, boss);
    const w = whereOf();
    expect(w).toContain('"notIn":["COMPLETED","CANCELLED"]');
    expect(w).toContain('"in":["u1"]');
  });

  it('lọc important → where có isImportant=true', async () => {
    await taskQueryService.list({ important: true, sortField: 'createdAt' }, boss);
    expect(whereOf()).toContain('"isImportant":true');
  });

  it('lọc unseenOnly → chỉ id trong danh sách chưa xem', async () => {
    getUnseenTaskIds.mockResolvedValue(['u1', 'u2']);
    await taskQueryService.list({ unseenOnly: true, sortField: 'createdAt' }, boss);
    expect(whereOf()).toContain('"id":{"in":["u1","u2"]}');
  });

  it('gắn cờ isUnseen cho task chưa xem, giữ isImportant thật', async () => {
    getUnseenTaskIds.mockResolvedValue(['u1']);
    findMany.mockResolvedValueOnce([row('u1', { status: 'COMPLETED', isImportant: true }), row('t2')]);
    count.mockResolvedValueOnce(2);
    const res = await taskQueryService.list({ sortField: 'createdAt' }, boss);
    expect(res.data.map((t) => [t.id, t.isUnseen, t.isImportant])).toEqual([['u1', true, true], ['t2', false, false]]);
  });

  it('chọn sort cụ thể → 1 query, orderBy theo lựa chọn', async () => {
    await taskQueryService.list({ sortField: 'scheduleEnd', sortOrder: 'asc' }, boss);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ scheduleEnd: 'asc' });
  });

  describe('sort mặc định: chưa xem → ★ → ưu tiên', () => {
    const SMART = [{ isImportant: 'desc' }, { priority: { level: 'desc' } }, { createdAt: 'desc' }];

    it('trang 1: lấy nhóm chưa xem trước, phần còn lại lấy từ nhóm khác', async () => {
      getUnseenTaskIds.mockResolvedValue(['u1', 'u2']);
      count.mockResolvedValueOnce(2).mockResolvedValueOnce(30); // unseen, rest
      findMany
        .mockResolvedValueOnce([row('u1', { status: 'COMPLETED' }), row('u2', { status: 'COMPLETED' })])
        .mockResolvedValueOnce([row('r1'), row('r2'), row('r3')]);

      const res = await taskQueryService.list({ page: 1, limit: 5 }, boss);

      expect(res.data.map((t) => t.id)).toEqual(['u1', 'u2', 'r1', 'r2', 'r3']);
      expect(res.pagination.total).toBe(32);
      expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 5, orderBy: SMART });
      expect(JSON.stringify(findMany.mock.calls[0][0].where)).toContain('"id":{"in":["u1","u2"]}');
      expect(findMany.mock.calls[1][0]).toMatchObject({ skip: 0, take: 3, orderBy: SMART });
      expect(JSON.stringify(findMany.mock.calls[1][0].where)).toContain('"notIn":["u1","u2"]');
    });

    it('trang 2: bỏ qua nhóm chưa xem, skip đúng trong nhóm còn lại', async () => {
      getUnseenTaskIds.mockResolvedValue(['u1', 'u2']);
      count.mockResolvedValueOnce(2).mockResolvedValueOnce(30);
      findMany.mockResolvedValueOnce([row('r4')]);

      await taskQueryService.list({ page: 2, limit: 5 }, boss);

      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 3, take: 5 });
    });
  });
});
