/**
 * Tests cho rejectTask — phục hồi người transfer gốc khi bị trả lại
 *
 * S10: Nếu người transfer gốc đã bị deactivate (isActive=false)
 *      → KHÔNG phục hồi về IN_PROGRESS, check allFailed thay vì notify
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowError } from '../_shared';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  txAssigneeFindUnique: vi.fn(),
  txAssigneeUpdate: vi.fn().mockResolvedValue({}),
  txUserFindUnique: vi.fn(),
  txAuditCreate: vi.fn().mockResolvedValue({}),
  userFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        taskAssignee: {
          update: mocks.txAssigneeUpdate,
          findUnique: mocks.txAssigneeFindUnique,
        },
        user: { findUnique: mocks.txUserFindUnique },
        taskAuditLog: { create: mocks.txAuditCreate },
      }),
    ),
  },
}));

vi.mock('../_shared', async () => {
  const actual = await vi.importActual<typeof import('../_shared')>('../_shared');
  return {
    ...actual,
    getTaskOrThrow: vi.fn(),
    createNotification: vi.fn().mockResolvedValue(undefined),
    checkAllFailed: vi.fn().mockResolvedValue(undefined),
  };
});

import { rejectTask } from '../assignment.service';
import { getTaskOrThrow, createNotification, checkAllFailed } from '../_shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test',
    taskCode: 'T-001',
    status: 'WAITING_ACKNOWLEDGE',
    isForceMode: false,
    creatorId: 'creator-1',
    assignees: [
      { id: 'a-me', userId: 'me', status: 'PENDING', transferredFrom: null, user: { displayName: 'Me' } },
    ],
    creator: { id: 'creator-1', displayName: 'Boss' },
    ...overrides,
  };
}

const me = { id: 'me', role: { name: 'EMPLOYEE' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rejectTask — validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('task không ở WAITING/IN_PROGRESS → INVALID_STATUS', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ status: 'COMPLETED' }) as never);
    const err = await rejectTask('task-1', {}, me).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('INVALID_STATUS');
  });

  it('ForceMode → FORCE_MODE', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ isForceMode: true }) as never);
    const err = await rejectTask('task-1', {}, me).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('FORCE_MODE');
  });

  it('không phải PENDING assignee → NOT_ASSIGNEE', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [{ id: 'a-other', userId: 'other', status: 'PENDING', user: { displayName: 'X' } }],
    }) as never);
    const err = await rejectTask('task-1', {}, me).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('NOT_ASSIGNEE');
  });
});

describe('rejectTask — phục hồi transfer source (S10)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('không có source → check allFailed', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask() as never);
    await rejectTask('task-1', { reason: 'Từ chối' }, me);
    expect(checkAllFailed).toHaveBeenCalledWith('task-1', 'creator-1');
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('source ACTIVE → phục hồi IN_PROGRESS + notify', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [
        { id: 'a-me', userId: 'me', status: 'PENDING', transferredFrom: 'boss-src', user: { displayName: 'Me' } },
      ],
    }) as never);
    mocks.txAssigneeFindUnique.mockResolvedValue({ id: 'a-src', status: 'TRANSFERRED' });
    mocks.txUserFindUnique.mockResolvedValue({ id: 'boss-src', displayName: 'Source', isActive: true });
    mocks.userFindUnique.mockResolvedValue({ isActive: true });

    await rejectTask('task-1', {}, me);

    expect(mocks.txAssigneeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a-src' },
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      'boss-src',
      'task-1',
      'TRANSFER_RECEIVED',
      expect.stringContaining('trả lại'),
      expect.any(String),
    );
    expect(checkAllFailed).not.toHaveBeenCalled();
  });

  it('source INACTIVE (deactivated) → KHÔNG phục hồi, check allFailed', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [
        { id: 'a-me', userId: 'me', status: 'PENDING', transferredFrom: 'dead-user', user: { displayName: 'Me' } },
      ],
    }) as never);
    mocks.txAssigneeFindUnique.mockResolvedValue({ id: 'a-src', status: 'TRANSFERRED' });
    mocks.txUserFindUnique.mockResolvedValue({ id: 'dead-user', displayName: 'Dead', isActive: false });
    mocks.userFindUnique.mockResolvedValue({ isActive: false });

    await rejectTask('task-1', {}, me);

    // Update sang IN_PROGRESS KHÔNG được gọi
    const restoreCall = mocks.txAssigneeUpdate.mock.calls.find(
      (c) => c[0].data?.status === 'IN_PROGRESS',
    );
    expect(restoreCall).toBeUndefined();

    // Không notify source dead
    expect(createNotification).not.toHaveBeenCalled();
    expect(checkAllFailed).toHaveBeenCalledWith('task-1', 'creator-1');
  });
});
