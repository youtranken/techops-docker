/**
 * createNotification — email fallback (commit 3c0982d): khi chưa Admin/Boss nào tick loại email,
 * các loại quan trọng (TASK_ASSIGNED, REVIEW_REQUIRED…) vẫn gửi email.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { userFindUnique, prefsFindFirst, prefsFindMany, notifCreate } = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  prefsFindFirst: vi.fn(),
  prefsFindMany: vi.fn(),
  notifCreate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, findMany: vi.fn().mockResolvedValue([]) },
    userNotificationPrefs: { findFirst: prefsFindFirst, findMany: prefsFindMany },
  },
}));
vi.mock('@/modules/notifications/services/notification.service', () => ({
  notificationService: { create: notifCreate },
}));

import { createNotification } from '../_shared';

const sentEmail = () => notifCreate.mock.calls[0][0].sendEmail;

beforeEach(() => {
  vi.clearAllMocks();
  userFindUnique.mockResolvedValue({ role: { name: 'EMPLOYEE' } });
  prefsFindFirst.mockResolvedValue(null);
});

describe('createNotification — email fallback', () => {
  it('chưa ai tick loại email → TASK_ASSIGNED vẫn gửi email', async () => {
    prefsFindMany.mockResolvedValue([]);
    await createNotification('u1', 't1', 'TASK_ASSIGNED', 'T', 'M');
    expect(sentEmail()).toBe(true);
  });

  it('đã có Admin/Boss tick loại khác → chỉ gửi loại được tick', async () => {
    prefsFindMany.mockResolvedValue([{ emailTypes: ['REVIEW_REQUIRED'] }]);
    await createNotification('u1', 't1', 'TASK_ASSIGNED', 'T', 'M');
    expect(sentEmail()).toBe(false);
  });

  it('Admin tắt master switch → không gửi', async () => {
    prefsFindFirst.mockResolvedValue({ emailEnabled: false });
    prefsFindMany.mockResolvedValue([]);
    await createNotification('u1', 't1', 'TASK_ASSIGNED', 'T', 'M');
    expect(sentEmail()).toBe(false);
  });
});
