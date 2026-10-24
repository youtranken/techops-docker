/** Research — khối lượng: việc Chờ nhận (WAITING_ACKNOWLEDGE) phải được đếm vào "đang chờ". */
import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { taskAssignee: { findMany: mocks.findMany } } }));

import { researchService } from '../research.service';

describe('getWorkloadBalance', () => {
  it('đếm Chờ nhận + Chờ duyệt + Chờ nghiệm thu vào pendingCount', async () => {
    const user = { id: 'u1', displayName: 'A', username: 'a' };
    mocks.findMany.mockResolvedValue(
      ['WAITING_ACKNOWLEDGE', 'PENDING_APPROVAL', 'PENDING_REVIEW', 'IN_PROGRESS'].map((status) => ({ userId: 'u1', user, task: { status } })),
    );
    const [row] = await researchService.getWorkloadBalance();
    expect(row.pendingCount).toBe(3);
    expect(row.inProgressCount).toBe(1);
  });
});
