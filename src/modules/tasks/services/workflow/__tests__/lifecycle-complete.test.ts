/**
 * Tests cho lifecycle.service — hàm complete (báo cáo hoàn thành)
 *
 * - DIRECT  + all done → COMPLETED
 * - APPROVAL + all done → PENDING_REVIEW
 * - REVISION_REQUIRED → luôn PENDING_REVIEW (Boss phải review lại)
 * - Partial completion → giữ IN_PROGRESS
 * - S2: filePath validation (path traversal, absolute paths, URLs)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowError } from '../_shared';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const txState: {
  allAssignees: { id: string; status: string }[];
  reportVersion: number;
} = {
  allAssignees: [],
  reportVersion: 0,
};

const taskUpdateMock = vi.fn().mockResolvedValue({});

vi.mock('@/lib/prisma', () => ({
  Prisma: { TransactionIsolationLevel: { Serializable: 'Serializable' } },
  prisma: {
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        assigneeReport: {
          findFirst: vi.fn().mockResolvedValue({ version: txState.reportVersion }),
          create: vi.fn().mockResolvedValue({ id: 'report-1' }),
        },
        reportAttachment: { createMany: vi.fn().mockResolvedValue({}) },
        taskAssignee: {
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockImplementation(async () => txState.allAssignees),
        },
        task: { update: taskUpdateMock },
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
    notifyBosses: vi.fn().mockResolvedValue(undefined),
    createNotification: vi.fn().mockResolvedValue(undefined),
  };
});

import { complete } from '../lifecycle.service';
import { getTaskOrThrow } from '../_shared';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test',
    taskCode: 'T-001',
    status: 'IN_PROGRESS',
    workflowMode: 'IMMEDIATE',
    creatorId: 'creator-1',
    isForceMode: false,
    assignees: [
      { id: 'a-1', userId: 'user-1', status: 'IN_PROGRESS', user: { displayName: 'U1' } },
    ],
    creator: { id: 'creator-1', displayName: 'Boss' },
    ...overrides,
  };
}

const user1 = { id: 'user-1', role: { name: 'EMPLOYEE' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('complete — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txState.allAssignees = [{ id: 'a-1', status: 'COMPLETED' }];
  });

  it('task không phải IN_PROGRESS/REVISION_REQUIRED → INVALID_STATUS', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ status: 'WAITING_ACKNOWLEDGE' }) as never);
    const err = await complete('task-1', { reportContent: 'Done' }, user1).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('INVALID_STATUS');
  });

  it('không phải assignee → NOT_ASSIGNEE', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask() as never);
    const err = await complete('task-1', { reportContent: 'Done' }, { id: 'stranger', role: { name: 'EMPLOYEE' } }).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('NOT_ASSIGNEE');
  });

  it('report rỗng → REPORT_REQUIRED', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask() as never);
    const err = await complete('task-1', { reportContent: '   ' }, user1).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('REPORT_REQUIRED');
  });

  it('> 3 file → FILE_LIMIT_EXCEEDED', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask() as never);
    const files = Array.from({ length: 4 }, (_, i) => ({ fileName: `f${i}.txt`, filePath: `uploads/f${i}.txt`, fileSize: 1000 }));
    const err = await complete('task-1', { reportContent: 'Done', files }, user1).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('FILE_LIMIT_EXCEEDED');
  });

  it('file > 10MB → FILE_LIMIT_EXCEEDED', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask() as never);
    const files = [{ fileName: 'big.zip', filePath: 'uploads/big.zip', fileSize: 11 * 1024 * 1024 }];
    const err = await complete('task-1', { reportContent: 'Done', files }, user1).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('FILE_LIMIT_EXCEEDED');
  });
});

describe('complete — S2 filePath validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txState.allAssignees = [{ id: 'a-1', status: 'COMPLETED' }];
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask() as never);
  });

  const invalidPaths = [
    ['path traversal ../', '../etc/passwd'],
    ['absolute unix /', '/etc/passwd'],
    ['absolute windows \\', '\\windows\\system32'],
    ['drive letter C:', 'C:/Windows/system32'],
    ['url http://', 'http://evil.com/x'],
    ['empty', ''],
  ];

  it.each(invalidPaths)('%s → INVALID_FILE_PATH', async (_label, badPath) => {
    const files = [{ fileName: 'x.txt', filePath: badPath, fileSize: 1000 }];
    const err = await complete('task-1', { reportContent: 'Done', files }, user1).catch(e => e);
    expect(err).toBeInstanceOf(WorkflowError);
    expect((err as WorkflowError).code).toBe('INVALID_FILE_PATH');
  });

  it('valid relative path → không throw', async () => {
    const files = [{ fileName: 'x.txt', filePath: 'uploads/2026/x.txt', fileSize: 1000 }];
    await expect(complete('task-1', { reportContent: 'Done', files }, user1)).resolves.toBeUndefined();
  });
});

describe('complete — status transition (DIRECT vs APPROVAL)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('DIRECT + all done → COMPLETED', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'IMMEDIATE' }) as never);
    txState.allAssignees = [{ id: 'a-1', status: 'COMPLETED' }];
    await complete('task-1', { reportContent: 'Done' }, user1);
    expect(taskUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    );
  });

  it('APPROVAL + all done → PENDING_REVIEW (không chuyển COMPLETED ngay)', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({ workflowMode: 'NEED_APPROVAL' }) as never);
    txState.allAssignees = [{ id: 'a-1', status: 'COMPLETED' }];
    await complete('task-1', { reportContent: 'Done' }, user1);
    expect(taskUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_REVIEW' }) }),
    );
  });

  it('REVISION_REQUIRED (DIRECT) → PENDING_REVIEW (Boss phải review lại)', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      workflowMode: 'IMMEDIATE',
      status: 'REVISION_REQUIRED',
      assignees: [{ id: 'a-1', userId: 'user-1', status: 'REVISION_REQUIRED', user: { displayName: 'U1' } }],
    }) as never);
    txState.allAssignees = [{ id: 'a-1', status: 'COMPLETED' }];
    await complete('task-1', { reportContent: 'Redone' }, user1);
    expect(taskUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_REVIEW' }) }),
    );
  });

  it('Partial: 1 xong, 1 còn IN_PROGRESS → task giữ IN_PROGRESS (không update)', async () => {
    vi.mocked(getTaskOrThrow).mockResolvedValue(makeTask({
      workflowMode: 'IMMEDIATE',
      assignees: [
        { id: 'a-1', userId: 'user-1', status: 'IN_PROGRESS', user: { displayName: 'U1' } },
        { id: 'a-2', userId: 'user-2', status: 'IN_PROGRESS', user: { displayName: 'U2' } },
      ],
    }) as never);
    txState.allAssignees = [
      { id: 'a-1', status: 'COMPLETED' },
      { id: 'a-2', status: 'IN_PROGRESS' }, // còn 1 chưa xong
    ];
    await complete('task-1', { reportContent: 'Done' }, user1);
    expect(taskUpdateMock).not.toHaveBeenCalled();
  });
});
