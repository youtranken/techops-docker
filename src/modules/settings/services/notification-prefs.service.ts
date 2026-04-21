import { prisma } from '@/lib/prisma';

const DEFAULT_TYPES = ['TASK_ASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'DEADLINE_REMINDER'];

export const notificationPrefsService = {
  /**
   * Kiểm tra xem có nên gửi email cho userId với loại sự kiện eventType không.
   * - EMPLOYEE: dùng prefs riêng.
   * - BOSS/ADMIN: dùng shared prefs.
   * In-app notification vẫn luôn tạo — hàm này chỉ kiểm soát email.
   */
  async shouldSendEmail(userId: string, eventType: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });
    if (!user) return false;

    const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role?.name ?? '');

    if (isPrivileged) {
      const prefs = await notificationPrefsService.getShared();
      return prefs.emailEnabled && (prefs.emailTypes as string[]).includes(eventType);
    } else {
      const prefs = await notificationPrefsService.get(userId);
      return prefs.emailEnabled && (prefs.emailTypes as string[]).includes(eventType);
    }
  },
  /** Employee: per-user prefs */
  async get(userId: string) {
    const prefs = await prisma.userNotificationPrefs.findUnique({ where: { userId } });
    if (!prefs) return { userId, emailEnabled: true, emailTypes: DEFAULT_TYPES };
    return prefs;
  },

  /**
   * Boss/Admin: shared policy — union of all active Boss+Admin prefs.
   * Both roles always see the same merged set.
   */
  async getShared(): Promise<{ emailEnabled: boolean; emailTypes: string[] }> {
    const allPrefs = await prisma.userNotificationPrefs.findMany({
      where: { user: { role: { name: { in: ['ADMIN', 'BOSS'] } }, isActive: true } },
      select: { emailEnabled: true, emailTypes: true },
    });
    if (allPrefs.length === 0) {
      return { emailEnabled: true, emailTypes: DEFAULT_TYPES };
    }
    const emailEnabled = allPrefs.some((p) => p.emailEnabled);
    const emailTypes = Array.from(new Set(allPrefs.flatMap((p) => p.emailTypes as string[])));
    return { emailEnabled, emailTypes };
  },

  /** Employee: per-user upsert */
  async upsert(userId: string, data: { emailEnabled?: boolean; emailTypes?: string[] }) {
    return prisma.userNotificationPrefs.upsert({
      where: { userId },
      update: data,
      create: { userId, emailEnabled: data.emailEnabled ?? true, emailTypes: data.emailTypes ?? [] },
    });
  },

  /**
   * Boss/Admin: apply the same prefs to ALL active Boss+Admin users.
   * Ensures both roles always see identical settings.
   */
  async upsertShared(data: { emailEnabled?: boolean; emailTypes?: string[] }): Promise<void> {
    const users = await prisma.user.findMany({
      where: { role: { name: { in: ['ADMIN', 'BOSS'] } }, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) =>
        prisma.userNotificationPrefs.upsert({
          where: { userId: u.id },
          update: data,
          create: { userId: u.id, emailEnabled: data.emailEnabled ?? true, emailTypes: data.emailTypes ?? [] },
        }),
      ),
    );
  },
};
