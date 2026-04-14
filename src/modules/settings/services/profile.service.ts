import { prisma } from '@/lib/prisma';
import type { ProfileUpdateInput } from '../types';

export const profileService = {
  async get(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, displayName: true, email: true,
        createdAt: true,
        role: { select: { name: true } },
        profile: {
          select: {
            avatarColor: true, avatarUrl: true,
            phone: true, department: true, position: true, bio: true, timezone: true,
          },
        },
      },
    });
    return user;
  },

  async update(userId: string, data: ProfileUpdateInput) {
    const { displayName, email, avatarColor, avatarUrl, phone, department, position, bio, timezone } = data;

    // Update User table fields
    if (displayName !== undefined || email !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(displayName !== undefined ? { displayName } : {}),
          ...(email !== undefined ? { email: email || null } : {}),
        },
      });
    }

    // Upsert UserProfile table fields
    const profileData = { avatarColor, avatarUrl, phone, department, position, bio, timezone };
    const hasProfileData = Object.values(profileData).some((v) => v !== undefined);
    if (hasProfileData) {
      const clean = Object.fromEntries(
        Object.entries(profileData).filter(([, v]) => v !== undefined)
      ) as Record<string, string | null>;
      await prisma.userProfile.upsert({
        where: { userId },
        update: clean,
        create: { userId, ...clean },
      });
    }

    return profileService.get(userId);
  },
};
