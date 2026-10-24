/**
 * Tests cho user-query.service — không được trả mã băm mật khẩu ra API
 * (GET /api/hr/users trả nguyên kết quả service cho mọi người đã đăng nhập).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: mocks.findMany, count: mocks.count, findUnique: mocks.findUnique } },
}));

import { userQueryService } from '../user-query.service';

const ROW = {
  id: 'u-1',
  username: 'nv01',
  displayName: 'Nhân viên 1',
  password: '$2a$12$hashhashhashhashhashhash',
  isActive: true,
  role: { id: 'r-1', name: 'EMPLOYEE' },
  profile: null,
  _count: { createdTasks: 1, assignments: 0 },
};

describe('userQueryService — không lộ password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([ROW]);
    mocks.count.mockResolvedValue(1);
    mocks.findUnique.mockResolvedValue({ ...ROW, _count: undefined });
  });

  it('list() bỏ trường password, giữ các trường khác', async () => {
    const res = await userQueryService.list({});
    expect(res.data[0]).not.toHaveProperty('password');
    expect(res.data[0]).toMatchObject({ id: 'u-1', username: 'nv01', hasTasks: true, role: { name: 'EMPLOYEE' } });
  });

  it('listForEmployee() bỏ trường password', async () => {
    const res = await userQueryService.listForEmployee('u-9', {});
    expect(res.data[0]).not.toHaveProperty('password');
  });

  it('getById() bỏ trường password', async () => {
    const u = await userQueryService.getById('u-1');
    expect(u).not.toHaveProperty('password');
    expect(u.role.name).toBe('EMPLOYEE');
  });
});
