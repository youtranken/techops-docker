/**
 * Tests cho task-tracking.service — ★ quan trọng + "Hoàn thành – chưa xem" (V2)
 *
 * - Chỉ BOSS/ADMIN được đánh ★, xem/đánh dấu "đã xem", có số đếm sidebar
 * - "Đã xem" ghi riêng từng người (upsert theo taskId + userId)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryRawMock, taskFindUnique, taskUpdate, taskCount, viewUpsert, transactionMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  taskFindUnique: vi.fn(),
  taskUpdate: vi.fn().mockResolvedValue({}),
  taskCount: vi.fn(),
  viewUpsert: vi.fn().mockResolvedValue({}),
  transactionMock: vi.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $transaction: (ops: unknown[]) => transactionMock(ops),
    task: { findUnique: taskFindUnique, update: taskUpdate, count: taskCount },
    taskCompletionView: { upsert: viewUpsert },
  },
}));

import { taskTrackingService, isTrackingRole } from '../task-tracking.service';

const boss = { id: 'boss-1', role: { name: 'BOSS' } };
const admin = { id: 'admin-1', role: { name: 'ADMIN' } };
const emp = { id: 'emp-1', role: { name: 'EMPLOYEE' } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isTrackingRole', () => {
  it('BOSS, ADMIN → true; EMPLOYEE → false', () => {
    expect(isTrackingRole('BOSS')).toBe(true);
    expect(isTrackingRole('ADMIN')).toBe(true);
    expect(isTrackingRole('EMPLOYEE')).toBe(false);
  });
});

describe('getUnseenTaskIds', () => {
  it('EMPLOYEE → [] và không query DB', async () => {
    expect(await taskTrackingService.getUnseenTaskIds(emp)).toEqual([]);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it('chỉ tính task hoàn thành sau khi tài khoản Boss/Admin được tạo (user mới không bị ngập task cũ)', async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await taskTrackingService.getUnseenTaskIds(boss);
    const sql = (queryRawMock.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toMatch(/"completedAt"[^]*>=[^]*u\."createdAt"/);
  });

  it('bỏ qua task được tạo sẵn ở trạng thái Hoàn thành (Helpdesk sync) — dựa vào audit TASK_CREATED', async () => {
    queryRawMock.mockResolvedValueOnce([]);
    await taskTrackingService.getUnseenTaskIds(boss);
    const sql = (queryRawMock.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toMatch(/NOT EXISTS[^]*"TaskAuditLog"[^]*'TASK_CREATED'[^]*"newStatus" = 'COMPLETED'/);
  });

  it('BOSS → trả danh sách id từ query', async () => {
    queryRawMock.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    expect(await taskTrackingService.getUnseenTaskIds(boss)).toEqual(['t1', 't2']);
  });
});

describe('setImportant', () => {
  it('EMPLOYEE → PERMISSION_DENIED', async () => {
    await expect(taskTrackingService.setImportant('t1', true, emp)).rejects.toThrow('PERMISSION_DENIED');
    expect(taskUpdate).not.toHaveBeenCalled();
  });

  it('task không tồn tại → TASK_NOT_FOUND', async () => {
    taskFindUnique.mockResolvedValueOnce(null);
    await expect(taskTrackingService.setImportant('t1', true, boss)).rejects.toThrow('TASK_NOT_FOUND');
  });

  it('ADMIN bật ★ → update isImportant=true', async () => {
    taskFindUnique.mockResolvedValueOnce({ id: 't1' });
    await taskTrackingService.setImportant('t1', true, admin);
    expect(taskUpdate).toHaveBeenCalledWith({ where: { id: 't1' }, data: { isImportant: true } });
  });
});

describe('markSeen', () => {
  it('EMPLOYEE → không ghi gì', async () => {
    await taskTrackingService.markSeen('t1', emp);
    expect(viewUpsert).not.toHaveBeenCalled();
  });

  it('task chưa COMPLETED → không ghi', async () => {
    taskFindUnique.mockResolvedValueOnce({ status: 'IN_PROGRESS' });
    await taskTrackingService.markSeen('t1', boss);
    expect(viewUpsert).not.toHaveBeenCalled();
  });

  it('BOSS mở task COMPLETED → upsert theo (taskId, userId) của chính Boss', async () => {
    taskFindUnique.mockResolvedValueOnce({ status: 'COMPLETED' });
    await taskTrackingService.markSeen('t1', boss);
    expect(viewUpsert).toHaveBeenCalledTimes(1);
    const arg = viewUpsert.mock.calls[0][0];
    expect(arg.where).toEqual({ taskId_userId: { taskId: 't1', userId: 'boss-1' } });
    expect(arg.create).toMatchObject({ taskId: 't1', userId: 'boss-1' });
    expect(arg.update.seenAt).toBeInstanceOf(Date);
  });
});

describe('markAllSeen', () => {
  it('upsert cho mọi task chưa xem của user, trả số lượng', async () => {
    queryRawMock.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);
    const n = await taskTrackingService.markAllSeen(boss);
    expect(n).toBe(2);
    expect(viewUpsert).toHaveBeenCalledTimes(2);
  });

  it('EMPLOYEE → 0', async () => {
    expect(await taskTrackingService.markAllSeen(emp)).toBe(0);
  });
});

describe('getCounters', () => {
  it('EMPLOYEE → { important: 0, unseen: 0 }, không query', async () => {
    expect(await taskTrackingService.getCounters(emp)).toEqual({ important: 0, unseen: 0 });
    expect(taskCount).not.toHaveBeenCalled();
  });

  it('BOSS → important đếm task ★ chưa kết thúc HOẶC chưa xem', async () => {
    queryRawMock.mockResolvedValueOnce([{ id: 't9' }]);
    taskCount.mockResolvedValueOnce(4);
    const res = await taskTrackingService.getCounters(boss);
    expect(res).toEqual({ important: 4, unseen: 1 });
    expect(taskCount).toHaveBeenCalledWith({
      where: {
        isImportant: true,
        OR: [
          { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          { id: { in: ['t9'] } },
        ],
      },
    });
  });
});
