/**
 * Tests cho task-detail.service.getById — V2: nhân viên không thấy ★
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { task: { findUnique } } }));

import { taskDetailService } from '../task-detail.service';

const task = {
  id: 't1', status: 'IN_PROGRESS', isImportant: true, creatorId: 'boss-1',
  assignees: [{ user: { id: 'emp-1' } }],
};

beforeEach(() => vi.clearAllMocks());

describe('getById — ★ isImportant', () => {
  it('BOSS thấy isImportant thật', async () => {
    findUnique.mockResolvedValueOnce({ ...task });
    const res = await taskDetailService.getById('t1', { id: 'boss-1', displayName: 'B', role: { name: 'BOSS' } });
    expect(res?.isImportant).toBe(true);
  });

  it('EMPLOYEE (assignee) → isImportant=false', async () => {
    findUnique.mockResolvedValueOnce({ ...task });
    const res = await taskDetailService.getById('t1', { id: 'emp-1', displayName: 'E', role: { name: 'EMPLOYEE' } });
    expect(res).not.toBeNull();
    expect(res?.isImportant).toBe(false);
  });
});
