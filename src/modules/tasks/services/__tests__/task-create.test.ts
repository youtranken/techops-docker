/**
 * Tests cho task-create.service — resolveInitialStatus cho DIRECT và APPROVAL
 *
 * F1: EMP  + IMMEDIATE + self only     → IN_PROGRESS
 * F2: EMP  + IMMEDIATE + has others    → WAITING_ACKNOWLEDGE
 * F3: EMP  + NEED_APPROVAL             → PENDING_APPROVAL
 * F4: BOSS + IMMEDIATE + self only     → IN_PROGRESS
 * F5: BOSS + IMMEDIATE + has others    → WAITING_ACKNOWLEDGE
 * F6: BOSS + NEED_APPROVAL             → WAITING_ACKNOWLEDGE (skip approval)
 * S8: empty assigneeIds                → ASSIGNEES_REQUIRED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const taskCreateMock = vi.fn();
const taskAssigneeCreateManyMock = vi.fn().mockResolvedValue({});
const taskAttachmentCreateManyMock = vi.fn().mockResolvedValue({});
const taskAuditLogCreateMock = vi.fn().mockResolvedValue({});
const taskFindFirstMock = vi.fn().mockResolvedValue(null);

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ displayName: 'Người tạo' }) },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        task: { findFirst: taskFindFirstMock, create: taskCreateMock },
        taskAssignee: { createMany: taskAssigneeCreateManyMock },
        taskAttachment: { createMany: taskAttachmentCreateManyMock },
        taskAuditLog: { create: taskAuditLogCreateMock },
      }),
    ),
  },
}));

vi.mock('../workflow/_shared', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
  notifyBosses: vi.fn().mockResolvedValue(undefined),
}));

import { createTask } from '../task-create.service';
import { createNotification, notifyBosses } from '../workflow/_shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Task test',
    content: 'Nội dung test',
    priorityId: 'p-1',
    typeId: 't-1',
    scheduleStart: '2026-04-20',
    scheduleEnd: '2026-04-30',
    workflowMode: 'IMMEDIATE' as const,
    assigneeIds: ['user-1'],
    isForceMode: false,
    ...overrides,
  };
}

const empUser   = { id: 'emp-1',   role: { name: 'EMPLOYEE' } };
const bossUser  = { id: 'boss-1',  role: { name: 'BOSS' } };
const adminUser = { id: 'admin-1', role: { name: 'ADMIN' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createTask — resolveInitialStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskCreateMock.mockImplementation(async ({ data }: { data: { status: string } }) => ({
      id: 'task-1',
      taskCode: '26-0001',
      title: 'Task test',
      status: data.status,
    }));
    taskFindFirstMock.mockResolvedValue(null);
  });

  describe('DIRECT (IMMEDIATE)', () => {
    it('F1: EMP + self-only → IN_PROGRESS', async () => {
      await createTask(baseInput({ assigneeIds: ['emp-1'] }), empUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'IN_PROGRESS' }) }),
      );
    });

    it('F2: EMP + has others → WAITING_ACKNOWLEDGE', async () => {
      await createTask(baseInput({ assigneeIds: ['emp-1', 'user-2'] }), empUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'WAITING_ACKNOWLEDGE' }) }),
      );
    });

    it('F4: BOSS + self-only → IN_PROGRESS', async () => {
      await createTask(baseInput({ assigneeIds: ['boss-1'] }), bossUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'IN_PROGRESS' }) }),
      );
    });

    it('F5: BOSS + has others → WAITING_ACKNOWLEDGE', async () => {
      await createTask(baseInput({ assigneeIds: ['boss-1', 'user-2'] }), bossUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'WAITING_ACKNOWLEDGE' }) }),
      );
    });
  });

  describe('APPROVAL (NEED_APPROVAL)', () => {
    it('F3: EMP + NEED_APPROVAL → PENDING_APPROVAL', async () => {
      await createTask(baseInput({ workflowMode: 'NEED_APPROVAL', assigneeIds: ['user-2'] }), empUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_APPROVAL' }) }),
      );
    });

    it('F6: BOSS + NEED_APPROVAL → WAITING_ACKNOWLEDGE (skip approval)', async () => {
      await createTask(baseInput({ workflowMode: 'NEED_APPROVAL', assigneeIds: ['user-2'] }), bossUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'WAITING_ACKNOWLEDGE' }) }),
      );
    });

    it('F6: ADMIN + NEED_APPROVAL → WAITING_ACKNOWLEDGE (skip approval)', async () => {
      await createTask(baseInput({ workflowMode: 'NEED_APPROVAL', assigneeIds: ['user-2'] }), adminUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'WAITING_ACKNOWLEDGE' }) }),
      );
    });
  });

  describe('Notifications', () => {
    it('PENDING_APPROVAL → notifyBosses được gọi', async () => {
      await createTask(baseInput({ workflowMode: 'NEED_APPROVAL', assigneeIds: ['user-2'] }), empUser);
      expect(notifyBosses).toHaveBeenCalled();
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('IN_PROGRESS (self-only) → KHÔNG gửi notification', async () => {
      await createTask(baseInput({ assigneeIds: ['emp-1'] }), empUser);
      expect(notifyBosses).not.toHaveBeenCalled();
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('WAITING_ACKNOWLEDGE → gửi cho assignees ngoài creator', async () => {
      await createTask(baseInput({ assigneeIds: ['emp-1', 'user-2', 'user-3'] }), empUser);
      expect(createNotification).toHaveBeenCalledTimes(2); // user-2 + user-3 (bỏ emp-1)
    });
  });

  describe('Guards', () => {
    it('S8: assigneeIds rỗng → ASSIGNEES_REQUIRED', async () => {
      await expect(createTask(baseInput({ assigneeIds: [] }), empUser))
        .rejects.toThrow('ASSIGNEES_REQUIRED');
    });
  });

  describe('generateTaskCode (MAX-based)', () => {
    it('không có task trước → 26-0001', async () => {
      taskFindFirstMock.mockResolvedValue(null);
      await createTask(baseInput({ assigneeIds: ['emp-1'] }), empUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ taskCode: expect.stringMatching(/^\d{2}-0001$/) }) }),
      );
    });

    it('đã có 26-0042 → next = 26-0043', async () => {
      taskFindFirstMock.mockResolvedValue({ taskCode: '26-0042' });
      await createTask(baseInput({ assigneeIds: ['emp-1'] }), empUser);
      expect(taskCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ taskCode: expect.stringMatching(/^\d{2}-0043$/) }) }),
      );
    });
  });
});

describe('createTask — ★ isImportant (V2: chỉ Boss/Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskCreateMock.mockImplementation(async ({ data }: { data: { status: string } }) => ({
      id: 'task-1', taskCode: '26-0001', title: 'Task test', status: data.status,
    }));
    taskFindFirstMock.mockResolvedValue(null);
  });

  it.each([['BOSS', bossUser], ['ADMIN', adminUser]] as const)('%s tạo với ★ → isImportant=true', async (_r, user) => {
    await createTask(baseInput({ assigneeIds: ['user-2'], isImportant: true }), user);
    expect(taskCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isImportant: true }) }),
    );
  });

  it('EMPLOYEE gửi isImportant=true → bị bỏ qua (false)', async () => {
    await createTask(baseInput({ assigneeIds: ['user-2'], isImportant: true }), empUser);
    expect(taskCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isImportant: false }) }),
    );
  });

  it('không gửi isImportant → false', async () => {
    await createTask(baseInput({ assigneeIds: ['user-2'] }), bossUser);
    expect(taskCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isImportant: false }) }),
    );
  });
});
