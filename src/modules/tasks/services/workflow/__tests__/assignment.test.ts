/**
 * Tests cho assignment.service — transfer loop check và reassign permissions
 *
 * Logic đã fix:
 * - transfer: cấm chuyển cho user đã từng TRANSFERRED task này (vòng lặp)
 * - reassign: APPROVAL mode chỉ Boss/Admin; DIRECT mode creator hoặc Boss/Admin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowError } from '../_shared';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    taskAssignee: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    taskAuditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    task: {
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        taskAssignee: {
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        task: { update: vi.fn().mockResolvedValue({}) },
        taskAuditLog: { create: vi.fn().mockResolvedValue({}) },
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
    notifyBosses: vi.fn().mockResolvedValue(undefined),
    checkAllFailed: vi.fn().mockResolvedValue(undefined),
  };
});

// ── Import sau mock ───────────────────────────────────────────────────────────

import { transfer, reassign } from '../assignment.service';
import { getTaskOrThrow } from '../_shared';
import { prisma } from '@/lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test Task',
    taskCode: 'T-001',
    status: 'IN_PROGRESS',
    workflowMode: 'IMMEDIATE',
    creatorId: 'creator-1',
    isForceMode: false,
    allFailed: false,
    assignees: [] as { userId: string; status: string; user: { displayName: string } }[],
    creator: { id: 'creator-1', displayName: 'Trần B' },
    ...overrides,
  };
}

const currentUser  = { id: 'user-1',    role: { name: 'EMPLOYEE' } };
const bossUser     = { id: 'boss-1',    role: { name: 'BOSS' } };
const adminUser    = { id: 'admin-1',   role: { name: 'ADMIN' } };
const creatorUser  = { id: 'creator-1', role: { name: 'EMPLOYEE' } };
const empUser      = { id: 'emp-99',    role: { name: 'EMPLOYEE' } };

// ── Transfer tests ────────────────────────────────────────────────────────────

describe('transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('task không phải IN_PROGRESS → INVALID_STATUS', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ status: 'WAITING_ACKNOWLEDGE' }) as never);
    const err = await transfer('task-1', { newAssigneeId: 'user-2' }, currentUser).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('INVALID_STATUS');
  });

  it('ForceMode bật → FORCE_MODE', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ isForceMode: true }) as never);
    const err = await transfer('task-1', { newAssigneeId: 'user-2' }, currentUser).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('FORCE_MODE');
  });

  it('chuyển cho chính mình → SAME_USER', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [{ userId: 'user-1', status: 'IN_PROGRESS', user: { displayName: 'User 1' } }],
    }) as never);
    const err = await transfer('task-1', { newAssigneeId: 'user-1' }, currentUser).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('SAME_USER');
  });

  it('người nhận không có trong DB → USER_NOT_FOUND', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [{ userId: 'user-1', status: 'IN_PROGRESS', user: { displayName: 'User 1' } }],
    }) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    const err = await transfer('task-1', { newAssigneeId: 'user-99' }, currentUser).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('USER_NOT_FOUND');
  });

  it('không phải người đang thực hiện → NOT_ASSIGNEE', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [], // không có user-1
    }) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-2', isActive: true } as never);
    const err = await transfer('task-1', { newAssigneeId: 'user-2' }, currentUser).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('NOT_ASSIGNEE');
  });

  it('chuyển cho người đã từng TRANSFERRED task này → TRANSFER_LOOP', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [
        { userId: 'user-1',   status: 'IN_PROGRESS', user: { displayName: 'User 1' } },
        { userId: 'user-prev', status: 'TRANSFERRED', user: { displayName: 'User Prev' } }, // đã transfer trước đó
      ],
    }) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-prev', isActive: true } as never);
    const err = await transfer('task-1', { newAssigneeId: 'user-prev' }, currentUser).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('TRANSFER_LOOP');
  });

  it('chuyển hợp lệ → không throw', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      assignees: [
        { userId: 'user-1', status: 'IN_PROGRESS', user: { displayName: 'User 1' } },
      ],
    }) as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-2', isActive: true } as never);
    await expect(transfer('task-1', { newAssigneeId: 'user-2' }, currentUser)).resolves.toBeUndefined();
  });
});

// ── Reassign tests ────────────────────────────────────────────────────────────

describe('reassign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeFailedTask(overrides: Record<string, unknown> = {}) {
    return makeTask({ allFailed: true, status: 'IN_PROGRESS', ...overrides });
  }

  describe('APPROVAL mode (NEED_APPROVAL)', () => {
    it('Boss reassign được → không throw', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({ workflowMode: 'NEED_APPROVAL' }) as never);
      await expect(reassign('task-1', { newAssigneeIds: ['user-2'] }, bossUser)).resolves.toBeUndefined();
    });

    it('Admin reassign được → không throw', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({ workflowMode: 'NEED_APPROVAL' }) as never);
      await expect(reassign('task-1', { newAssigneeIds: ['user-2'] }, adminUser)).resolves.toBeUndefined();
    });

    it('Creator (non-privileged) APPROVAL mode → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({
        workflowMode: 'NEED_APPROVAL',
        creatorId: 'creator-1',
      }) as never);
      const err = await reassign('task-1', { newAssigneeIds: ['user-2'] }, creatorUser).catch(e => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });

    it('Employee không phải creator APPROVAL mode → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({
        workflowMode: 'NEED_APPROVAL',
        creatorId: 'other-id',
      }) as never);
      const err = await reassign('task-1', { newAssigneeIds: ['user-2'] }, empUser).catch(e => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });
  });

  describe('DIRECT mode (IMMEDIATE)', () => {
    it('Creator DIRECT reassign được → không throw', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({
        workflowMode: 'IMMEDIATE',
        creatorId: 'creator-1',
      }) as never);
      await expect(reassign('task-1', { newAssigneeIds: ['user-2'] }, creatorUser)).resolves.toBeUndefined();
    });

    it('Boss DIRECT reassign được → không throw', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({ workflowMode: 'IMMEDIATE' }) as never);
      await expect(reassign('task-1', { newAssigneeIds: ['user-2'] }, bossUser)).resolves.toBeUndefined();
    });

    it('Employee không phải creator DIRECT mode → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({
        workflowMode: 'IMMEDIATE',
        creatorId: 'other-id',
      }) as never);
      const err = await reassign('task-1', { newAssigneeIds: ['user-2'] }, empUser).catch(e => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });
  });

  describe('Điều kiện allFailed', () => {
    it('allFailed = false → NOT_ALL_FAILED', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ allFailed: false, workflowMode: 'IMMEDIATE', creatorId: 'creator-1' }) as never);
      const err = await reassign('task-1', { newAssigneeIds: ['user-2'] }, creatorUser).catch(e => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('NOT_ALL_FAILED');
    });

    it('newAssigneeIds rỗng → NO_ASSIGNEES', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeFailedTask({ workflowMode: 'IMMEDIATE', creatorId: 'creator-1' }) as never);
      const err = await reassign('task-1', { newAssigneeIds: [] }, creatorUser).catch(e => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('NO_ASSIGNEES');
    });
  });
});
