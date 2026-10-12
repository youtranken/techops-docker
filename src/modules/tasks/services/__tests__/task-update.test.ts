/**
 * Tests cho task-update.service — canEdit permission logic theo workflowMode
 *
 * Logic đã fix:
 * - Creator DIRECT  (IMMEDIATE):   edit khi WAITING_ACKNOWLEDGE hoặc IN_PROGRESS
 * - Creator APPROVAL (NEED_APPROVAL): chỉ edit khi PENDING_APPROVAL
 * - Boss/Admin: edit khi PENDING_APPROVAL, WAITING_ACKNOWLEDGE, IN_PROGRESS
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'task-1' }),
    },
    priority: {
      findUnique: vi.fn().mockResolvedValue({ name: 'Medium' }),
    },
    taskType: {
      findUnique: vi.fn().mockResolvedValue({ name: 'Support' }),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    extensionRequest: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    taskAssignee: {
      deleteMany: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    taskAttachment: {
      deleteMany: vi.fn().mockResolvedValue({}),
      createMany: vi.fn().mockResolvedValue({}),
    },
    taskAuditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        task: { update: vi.fn().mockResolvedValue({ id: 'task-1' }) },
        extensionRequest: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({}) },
        taskAssignee: {
          deleteMany: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
          createMany: vi.fn().mockResolvedValue({}),
        },
        taskAttachment: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
        taskAuditLog: { create: vi.fn().mockResolvedValue({}) },
        notification: { createMany: vi.fn().mockResolvedValue({}) },
      }),
    ),
  },
}));

vi.mock('../workflow/_shared', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
  notifyBosses: vi.fn().mockResolvedValue(undefined),
}));

// ── Import sau mock ───────────────────────────────────────────────────────────

import { updateTask } from '../task-update.service';
import { prisma } from '@/lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExistingTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test Task',
    content: 'Content',
    status: 'IN_PROGRESS',
    workflowMode: 'IMMEDIATE',
    creatorId: 'creator-1',
    isForceMode: false,
    scheduleStart: new Date('2026-01-01'),
    scheduleEnd:   new Date('2026-01-31'),
    priority: { id: 'p-1', name: 'Medium' },
    type:     { id: 't-1', name: 'Support' },
    assignees: [],
    ...overrides,
  };
}

const bossUser    = { id: 'boss-1',    role: { name: 'BOSS' } };
const adminUser   = { id: 'admin-1',   role: { name: 'ADMIN' } };
const creatorUser = { id: 'creator-1', role: { name: 'EMPLOYEE' } };
const empUser     = { id: 'emp-99',    role: { name: 'EMPLOYEE' } };

const minData = { title: 'New Title' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('updateTask — canEdit permission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Boss và Admin', () => {
    it.each(['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS'] as const)(
      'Boss edit được khi status = %s',
      async (status) => {
        vi.mocked(prisma.task.findUnique).mockResolvedValue(makeExistingTask({ status }) as never);
        await expect(updateTask('task-1', minData, bossUser)).resolves.toBeDefined();
      },
    );

    it.each(['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS'] as const)(
      'Admin edit được khi status = %s',
      async (status) => {
        vi.mocked(prisma.task.findUnique).mockResolvedValue(makeExistingTask({ status }) as never);
        await expect(updateTask('task-1', minData, adminUser)).resolves.toBeDefined();
      },
    );

    it('Boss KHÔNG edit được khi COMPLETED → PERMISSION_DENIED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(makeExistingTask({ status: 'COMPLETED' }) as never);
      await expect(updateTask('task-1', minData, bossUser)).rejects.toThrow('PERMISSION_DENIED');
    });
  });

  describe('Creator DIRECT mode (IMMEDIATE)', () => {
    it('edit được khi WAITING_ACKNOWLEDGE', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'IMMEDIATE', status: 'WAITING_ACKNOWLEDGE' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).resolves.toBeDefined();
    });

    it('edit được khi IN_PROGRESS', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'IMMEDIATE', status: 'IN_PROGRESS' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).resolves.toBeDefined();
    });

    it('KHÔNG edit được khi PENDING_APPROVAL → PERMISSION_DENIED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'IMMEDIATE', status: 'PENDING_APPROVAL' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).rejects.toThrow('PERMISSION_DENIED');
    });

    it('KHÔNG edit được khi PENDING_REVIEW → PERMISSION_DENIED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'IMMEDIATE', status: 'PENDING_REVIEW' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).rejects.toThrow('PERMISSION_DENIED');
    });
  });

  describe('Creator APPROVAL mode (NEED_APPROVAL)', () => {
    it('edit được khi PENDING_APPROVAL (Boss chưa duyệt plan)', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'NEED_APPROVAL', status: 'PENDING_APPROVAL' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).resolves.toBeDefined();
    });

    it('KHÔNG edit được khi WAITING_ACKNOWLEDGE → PERMISSION_DENIED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'NEED_APPROVAL', status: 'WAITING_ACKNOWLEDGE' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).rejects.toThrow('PERMISSION_DENIED');
    });

    it('KHÔNG edit được khi IN_PROGRESS → PERMISSION_DENIED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'NEED_APPROVAL', status: 'IN_PROGRESS' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).rejects.toThrow('PERMISSION_DENIED');
    });

    it('KHÔNG edit được khi PENDING_REVIEW → PERMISSION_DENIED', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(
        makeExistingTask({ workflowMode: 'NEED_APPROVAL', status: 'PENDING_REVIEW' }) as never,
      );
      await expect(updateTask('task-1', minData, creatorUser)).rejects.toThrow('PERMISSION_DENIED');
    });
  });

  describe('Employee không phải creator', () => {
    it.each(['IMMEDIATE', 'NEED_APPROVAL'] as const)(
      'Employee không phải creator (%s) → PERMISSION_DENIED',
      async (workflowMode) => {
        vi.mocked(prisma.task.findUnique).mockResolvedValue(
          makeExistingTask({ workflowMode, status: 'IN_PROGRESS', creatorId: 'other-id' }) as never,
        );
        await expect(updateTask('task-1', minData, empUser)).rejects.toThrow('PERMISSION_DENIED');
      },
    );
  });

  describe('Task không tồn tại', () => {
    it('TASK_NOT_FOUND khi task null', async () => {
      vi.mocked(prisma.task.findUnique).mockResolvedValue(null as never);
      await expect(updateTask('task-1', minData, bossUser)).rejects.toThrow('TASK_NOT_FOUND');
    });
  });
});

describe('updateTask — ★ isImportant (V2: chỉ Boss/Admin)', () => {
  function captureUpdate() {
    const txTaskUpdate = vi.fn().mockResolvedValue({ id: 'task-1' });
    vi.mocked(prisma.$transaction).mockImplementationOnce(((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        task: { update: txTaskUpdate },
        extensionRequest: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({}) },
        taskAssignee: { deleteMany: vi.fn(), update: vi.fn(), createMany: vi.fn() },
        taskAttachment: { deleteMany: vi.fn(), createMany: vi.fn() },
        taskAuditLog: { create: vi.fn().mockResolvedValue({}) },
        notification: { createMany: vi.fn().mockResolvedValue({}) },
      })) as never);
    return txTaskUpdate;
  }

  beforeEach(() => vi.clearAllMocks());

  it('Boss bật ★ khi sửa → update có isImportant=true', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(makeExistingTask({ isImportant: false }) as never);
    const upd = captureUpdate();
    await updateTask('task-1', { isImportant: true }, bossUser);
    expect(upd).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isImportant: true }) }));
  });

  it('Creator EMPLOYEE gửi isImportant → bị bỏ qua', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(
      makeExistingTask({ workflowMode: 'IMMEDIATE', status: 'IN_PROGRESS', isImportant: false }) as never,
    );
    const upd = captureUpdate();
    await updateTask('task-1', { title: 'X', isImportant: true }, creatorUser);
    const data = upd.mock.calls[0]?.[0]?.data ?? {};
    expect(data).not.toHaveProperty('isImportant');
  });
});
