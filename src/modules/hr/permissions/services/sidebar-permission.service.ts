import { prisma } from '@/lib/prisma';
import type { UserPermRow, SavePermissionInput } from '../types';

class SidebarPermissionService {
  async listAll(): Promise<UserPermRow[]> {
    const records = await prisma.sidebarPermission.findMany({
      include: { user: { include: { role: true } } },
    });

    return records.map((r) => ({
      id: r.user.id,
      displayName: r.user.displayName,
      username: r.user.username,
      role: r.user.role,
      visibleMenus: JSON.parse(r.visibleMenus) as string[],
      featurePermissions: JSON.parse(r.featurePermissions) as Record<string, string[]>,
    }));
  }

  async getForUser(userId: string): Promise<UserPermRow | null> {
    const record = await prisma.sidebarPermission.findUnique({
      where: { userId },
      include: { user: { include: { role: true } } },
    });

    if (!record) return null;

    return {
      id: record.user.id,
      displayName: record.user.displayName,
      username: record.user.username,
      role: record.user.role,
      visibleMenus: JSON.parse(record.visibleMenus) as string[],
      featurePermissions: JSON.parse(record.featurePermissions) as Record<string, string[]>,
    };
  }

  async save(input: SavePermissionInput): Promise<void> {
    await prisma.sidebarPermission.upsert({
      where: { userId: input.userId },
      update: {
        visibleMenus: JSON.stringify(input.visibleMenus),
        featurePermissions: JSON.stringify(input.featurePermissions),
      },
      create: {
        userId: input.userId,
        visibleMenus: JSON.stringify(input.visibleMenus),
        featurePermissions: JSON.stringify(input.featurePermissions),
      },
    });
  }
}

export const sidebarPermissionService = new SidebarPermissionService();
