/**
 * Tests cho comment.service — M2 mentions dedup + cap
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  txCommentCreate: vi.fn(),
  txAuditCreate: vi.fn().mockResolvedValue({}),
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    comment: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        comment: { create: mocks.txCommentCreate, update: vi.fn() },
        taskAuditLog: { create: mocks.txAuditCreate },
      }),
    ),
  },
}));

vi.mock('../workflow/_shared', () => ({
  createNotification: mocks.createNotification,
}));

import { commentService } from '../comment.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const me = { id: 'me', role: { name: 'EMPLOYEE' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('commentService.create — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindFirst.mockResolvedValue({ id: 'task-1' });
    mocks.txCommentCreate.mockResolvedValue({
      id: 'c-1',
      content: '',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: 'me', displayName: 'Me', username: 'me', profile: null },
    });
  });

  it('content rỗng → COMMENT_CREATE_FAILED', async () => {
    const err = await commentService.create('task-1', { content: '' }, me).catch(e => e);
    expect(err.code).toBe('COMMENT_CREATE_FAILED');
  });

  it('content chỉ whitespace → COMMENT_CREATE_FAILED', async () => {
    const err = await commentService.create('task-1', { content: '   \n\t  ' }, me).catch(e => e);
    expect(err.code).toBe('COMMENT_CREATE_FAILED');
  });

  it('content > 5000 ký tự → COMMENT_CREATE_FAILED', async () => {
    const long = 'a'.repeat(5001);
    const err = await commentService.create('task-1', { content: long }, me).catch(e => e);
    expect(err.code).toBe('COMMENT_CREATE_FAILED');
  });

  it('task không tồn tại/không có quyền → COMMENT_CREATE_FAILED', async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    const err = await commentService.create('task-1', { content: 'ok' }, me).catch(e => e);
    expect(err.code).toBe('COMMENT_CREATE_FAILED');
  });
});

describe('commentService.create — M2 mentions dedup + cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindFirst.mockResolvedValue({ id: 'task-1' });
    mocks.txCommentCreate.mockResolvedValue({
      id: 'c-1',
      content: 'hi',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { id: 'me', displayName: 'Me', username: 'me', profile: null },
    });
  });

  it('dedup mentions trùng', async () => {
    await commentService.create('task-1', {
      content: 'hi',
      mentions: ['u-1', 'u-1', 'u-2', 'u-1'],
    }, me);

    const createCall = mocks.txCommentCreate.mock.calls[0]?.[0];
    const saved: string[] = createCall?.data?.mentions ?? [];
    expect(saved).toEqual(['u-1', 'u-2']);
  });

  it('cap mentions tối đa 20', async () => {
    const mentions = Array.from({ length: 30 }, (_, i) => `u-${i}`);
    await commentService.create('task-1', { content: 'hi', mentions }, me);

    const createCall = mocks.txCommentCreate.mock.calls[0]?.[0];
    const saved: string[] = createCall?.data?.mentions ?? [];
    expect(saved.length).toBe(20);
    expect(saved[0]).toBe('u-0');
    expect(saved[19]).toBe('u-19');
  });

  it('mentions rỗng → không notify', async () => {
    await commentService.create('task-1', { content: 'hi' }, me);
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it('không self-notify (me không tự nhận thông báo)', async () => {
    await commentService.create('task-1', { content: 'hi', mentions: ['me', 'u-2'] }, me);

    const calls = mocks.createNotification.mock.calls.map(c => c[0]);
    expect(calls).not.toContain('me');
    expect(calls).toContain('u-2');
  });

  it('notify từng mentioned user đúng 1 lần', async () => {
    await commentService.create('task-1', {
      content: 'hi',
      mentions: ['u-1', 'u-1', 'u-2'],
    }, me);

    const notifiedIds = mocks.createNotification.mock.calls.map(c => c[0]);
    expect(notifiedIds).toEqual(['u-1', 'u-2']);
  });
});
