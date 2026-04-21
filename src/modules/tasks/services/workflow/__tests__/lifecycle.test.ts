/**
 * Tests cho lifecycle.service — cancel permission logic
 *
 * Logic đã fix:
 * - Creator APPROVAL mode chỉ hủy được khi status = PENDING_APPROVAL
 * - Boss/Admin hủy được bất kỳ status nào (trừ COMPLETED/CANCELLED)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowError } from '../_shared';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    taskAssignee: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    extensionRequest: {
      updateMany: vi.fn().mockResolvedValue({}),
    },
    taskAuditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        task: { update: vi.fn().mockResolvedValue({}) },
        extensionRequest: { updateMany: vi.fn().mockResolvedValue({}) },
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
  };
});

// ── Import sau mock ───────────────────────────────────────────────────────────

import { cancel } from '../lifecycle.service';
import { getTaskOrThrow, createNotification } from '../_shared';

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
    assignees: [
      { userId: 'assignee-1', user: { displayName: 'Nguyễn A' } },
    ],
    creator: { id: 'creator-1', displayName: 'Trần B' },
    ...overrides,
  };
}

const creatorUser = { id: 'creator-1', role: { name: 'EMPLOYEE' } };
const bossUser    = { id: 'boss-1',    role: { name: 'BOSS' } };
const adminUser   = { id: 'admin-1',   role: { name: 'ADMIN' } };
const empUser     = { id: 'emp-99',    role: { name: 'EMPLOYEE' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('cancel — quyền hủy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DIRECT mode (IMMEDIATE)', () => {
    it('creator DIRECT hủy được ở IN_PROGRESS', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'IMMEDIATE', status: 'IN_PROGRESS' }) as never);
      await expect(cancel('task-1', {}, creatorUser)).resolves.toBeUndefined();
    });

    it('creator DIRECT hủy được ở WAITING_ACKNOWLEDGE', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'IMMEDIATE', status: 'WAITING_ACKNOWLEDGE' }) as never);
      await expect(cancel('task-1', {}, creatorUser)).resolves.toBeUndefined();
    });

    it('creator DIRECT hủy được ở PENDING_REVIEW', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'IMMEDIATE', status: 'PENDING_REVIEW' }) as never);
      await expect(cancel('task-1', {}, creatorUser)).resolves.toBeUndefined();
    });
  });

  describe('APPROVAL mode (NEED_APPROVAL) — creator bị giới hạn', () => {
    it('creator APPROVAL hủy được ở PENDING_APPROVAL', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL', status: 'PENDING_APPROVAL' }) as never);
      await expect(cancel('task-1', {}, creatorUser)).resolves.toBeUndefined();
    });

    it('creator APPROVAL KHÔNG hủy được ở WAITING_ACKNOWLEDGE → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL', status: 'WAITING_ACKNOWLEDGE' }) as never);
      const err = await cancel('task-1', {}, creatorUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });

    it('creator APPROVAL KHÔNG hủy được ở IN_PROGRESS → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL', status: 'IN_PROGRESS' }) as never);
      const err = await cancel('task-1', {}, creatorUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });

    it('creator APPROVAL KHÔNG hủy được ở PENDING_REVIEW → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL', status: 'PENDING_REVIEW' }) as never);
      const err = await cancel('task-1', {}, creatorUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });
  });

  describe('Boss/Admin không bị giới hạn bởi workflowMode', () => {
    it('Boss hủy được ở IN_PROGRESS (APPROVAL mode)', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL', status: 'IN_PROGRESS' }) as never);
      await expect(cancel('task-1', {}, bossUser)).resolves.toBeUndefined();
    });

    it('Admin hủy được ở PENDING_REVIEW (APPROVAL mode)', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL', status: 'PENDING_REVIEW' }) as never);
      await expect(cancel('task-1', {}, adminUser)).resolves.toBeUndefined();
    });

    it('Boss hủy được ở WAITING_ACKNOWLEDGE (DIRECT mode)', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'IMMEDIATE', status: 'WAITING_ACKNOWLEDGE' }) as never);
      await expect(cancel('task-1', {}, bossUser)).resolves.toBeUndefined();
    });
  });

  describe('Terminal status — không ai hủy được', () => {
    it('COMPLETED → INVALID_STATUS', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ status: 'COMPLETED' }) as never);
      const err = await cancel('task-1', {}, bossUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('INVALID_STATUS');
    });

    it('CANCELLED → INVALID_STATUS', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ status: 'CANCELLED' }) as never);
      const err = await cancel('task-1', {}, adminUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('INVALID_STATUS');
    });
  });

  describe('Người dùng không có quyền', () => {
    it('Employee không phải creator → FORBIDDEN', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ creatorId: 'other-id' }) as never);
      const err = await cancel('task-1', {}, empUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });
  });

  describe('ForceMode', () => {
    it('Creator không hủy được khi ForceMode bật', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ isForceMode: true, status: 'IN_PROGRESS', workflowMode: 'IMMEDIATE' }) as never);
      const err = await cancel('task-1', {}, creatorUser).catch((e) => e);
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe('FORBIDDEN');
    });

    it('Boss hủy được kể cả ForceMode bật', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ isForceMode: true, status: 'IN_PROGRESS' }) as never);
      await expect(cancel('task-1', {}, bossUser)).resolves.toBeUndefined();
    });
  });

  describe('Notification sau khi hủy', () => {
    it('gửi thông báo cho assignees (trừ người hủy)', async () => {
      vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
        status: 'IN_PROGRESS',
        workflowMode: 'IMMEDIATE',
        assignees: [
          { userId: 'assignee-1', user: { displayName: 'Nguyễn A' } },
          { userId: 'creator-1',  user: { displayName: 'Trần B' } }, // người hủy → không gửi
        ],
      }) as never);

      await cancel('task-1', { reason: 'Test' }, creatorUser);

      // createNotification chỉ được gọi cho assignee-1 (không phải creator-1)
      expect(createNotification).toHaveBeenCalledWith(
        'assignee-1',
        'task-1',
        'TASK_REJECTED',
        expect.stringContaining('bị hủy'),
        expect.any(String),
      );
      expect(createNotification).not.toHaveBeenCalledWith(
        'creator-1',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
