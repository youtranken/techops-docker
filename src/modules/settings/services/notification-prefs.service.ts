import { prisma } from '@/lib/prisma';

const DEFAULT_TYPES = ['TASK_ASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'DEADLINE_REMINDER'];

export const notificationPrefsService = {
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
