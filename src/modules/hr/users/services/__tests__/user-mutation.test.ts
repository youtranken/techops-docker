/**
 * Tests cho user-mutation.service — S10 deactivate huỷ assignment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  txUserUpdate: vi.fn().mockResolvedValue({ id: 'u-1', role: { name: 'EMPLOYEE' } }),
  txUserUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
  txAssigneeUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
  txAssigneeFindMany: vi.fn(),
  txTaskUpdate: vi.fn().mockResolvedValue({}),
  txActivityLogCreate: vi.fn().mockResolvedValue({}),
  txActivityLogCreateMany: vi.fn().mockResolvedValue({}),
  notifyCreate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    taskAssignee: { findMany: mocks.findMany },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: mocks.txUserUpdate, updateMany: mocks.txUserUpdateMany },
        taskAssignee: { updateMany: mocks.txAssigneeUpdateMany, findMany: mocks.txAssigneeFindMany },
        task: { update: mocks.txTaskUpdate },
        userActivityLog: { create: mocks.txActivityLogCreate, createMany: mocks.txActivityLogCreateMany },
      }),
    ),
  },
}));

vi.mock('@/lib/redis', () => ({
  getRedis: () => ({ del: vi.fn().mockResolvedValue(1), set: vi.fn().mockResolvedValue('OK') }),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../user-query.service', () => ({
  userQueryService: { getById: vi.fn().mockResolvedValue({ id: 'u-1' }) },
}));

vi.mock('@/modules/notifications/services/notification.service', () => ({
  notificationService: { create: mocks.notifyCreate },
}));

import { userMutationService } from '../user-mutation.service';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('deactivate — S10 huỷ assignments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('user không có assignment active → chỉ set isActive=false', async () => {
    mocks.findMany.mockResolvedValue([]);

    await userMutationService.deactivate('u-1', 'admin-1');

    expect(mocks.txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
    );
    expect(mocks.txAssigneeUpdateMany).not.toHaveBeenCalled();
    expect(mocks.notifyCreate).not.toHaveBeenCalled();
  });

  it('user có active assignments → set REJECTED và notify creator', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'as-1', taskId: 't-1', task: { id: 't-1', creatorId: 'creator-X', status: 'IN_PROGRESS' } },
    ]);
    mocks.txAssigneeFindMany.mockResolvedValue([
      { id: 'as-1', status: 'REJECTED' },
    ]);

    await userMutationService.deactivate('u-1', 'admin-1');

    expect(mocks.txAssigneeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED' }),
      }),
    );
    expect(mocks.notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'creator-X',
        type: 'ALL_FAILED',
      }),
    );
  });

  it('task đã COMPLETED → KHÔNG notify, KHÔNG mark allFailed', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'as-1', taskId: 't-1', task: { id: 't-1', creatorId: 'creator-X', status: 'COMPLETED' } },
    ]);

    await userMutationService.deactivate('u-1', 'admin-1');

    expect(mocks.txTaskUpdate).not.toHaveBeenCalled();
    expect(mocks.notifyCreate).not.toHaveBeenCalled();
  });

  it('creator chính là user bị deactivate → không tự-notify', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'as-1', taskId: 't-1', task: { id: 't-1', creatorId: 'u-1', status: 'IN_PROGRESS' } },
    ]);
    mocks.txAssigneeFindMany.mockResolvedValue([{ id: 'as-1', status: 'REJECTED' }]);

    await userMutationService.deactivate('u-1', 'admin-1');

    expect(mocks.notifyCreate).not.toHaveBeenCalled();
  });

  it('tất cả assignees REJECTED/TRANSFERRED → mark task allFailed=true', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'as-1', taskId: 't-1', task: { id: 't-1', creatorId: 'creator-X', status: 'IN_PROGRESS' } },
    ]);
    mocks.txAssigneeFindMany.mockResolvedValue([
      { id: 'as-1', status: 'REJECTED' },
      { id: 'as-2', status: 'TRANSFERRED' },
    ]);

    await userMutationService.deactivate('u-1', 'admin-1');

    expect(mocks.txTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't-1' },
        data: expect.objectContaining({ allFailed: true }),
      }),
    );
  });

  it('còn assignee COMPLETED → KHÔNG mark allFailed', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 'as-1', taskId: 't-1', task: { id: 't-1', creatorId: 'creator-X', status: 'IN_PROGRESS' } },
    ]);
    mocks.txAssigneeFindMany.mockResolvedValue([
      { id: 'as-1', status: 'REJECTED' },
      { id: 'as-completed', status: 'COMPLETED' },
    ]);

    await userMutationService.deactivate('u-1', 'admin-1');

    expect(mocks.txTaskUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ allFailed: true }) }),
    );
  });
});

describe('bulkDeactivate — S10', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bulk deactivate → cancel assignments cho tất cả users', async () => {
    mocks.findMany.mockResolvedValue([
      { taskId: 't-1', task: { id: 't-1', creatorId: 'creator-X', status: 'IN_PROGRESS' } },
      { taskId: 't-2', task: { id: 't-2', creatorId: 'creator-Y', status: 'IN_PROGRESS' } },
    ]);
    mocks.txAssigneeFindMany.mockResolvedValue([{ id: 'a', status: 'REJECTED' }]);

    await userMutationService.bulkDeactivate(['u-1', 'u-2'], 'admin-1');

    expect(mocks.txUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['u-1', 'u-2'] } },
        data: { isActive: false },
      }),
    );
    expect(mocks.txAssigneeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'REJECTED' }),
      }),
    );
  });
});

describe('không lộ password ở kết quả trả về', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deactivate() bỏ trường password', async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.txUserUpdate.mockResolvedValueOnce({ id: 'u-1', password: '$2a$12$hash', role: { name: 'EMPLOYEE' } });
    const u = await userMutationService.deactivate('u-1', 'admin-1');
    expect(u).not.toHaveProperty('password');
    expect(u).toMatchObject({ id: 'u-1', role: { name: 'EMPLOYEE' } });
  });
});
