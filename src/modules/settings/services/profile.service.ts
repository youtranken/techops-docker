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

    // S3: validate avatarUrl — only allow https:// URLs
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
      try {
        const parsed = new URL(avatarUrl);
        if (parsed.protocol !== 'https:') throw new Error();
      } catch {
        throw new Error('avatarUrl phải là HTTPS URL hợp lệ');
      }
    }

    // M1: validate timezone — dùng Intl.DateTimeFormat để nhận mọi IANA name hợp lệ
    // (kể cả alias như Asia/Saigon) và không phụ thuộc version tzdata của runtime
    if (timezone !== undefined && timezone !== '') {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone });
      } catch {
        throw new Error('Timezone không hợp lệ');
      }
    }

    // M3: wrap both writes in a single transaction to avoid partial-write window
    await prisma.$transaction(async (tx) => {
      if (displayName !== undefined || email !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(displayName !== undefined ? { displayName } : {}),
            ...(email !== undefined ? { email: email || null } : {}),
          },
        });
      }

      const profileData = { avatarColor, avatarUrl, phone, department, position, bio, timezone };
      const hasProfileData = Object.values(profileData).some((v) => v !== undefined);
      if (hasProfileData) {
        const clean = Object.fromEntries(
          Object.entries(profileData).filter(([, v]) => v !== undefined)
        ) as Record<string, string | null>;
        await tx.userProfile.upsert({
          where: { userId },
          update: clean,
          create: { userId, ...clean },
        });
      }
    });

    return profileService.get(userId);
  },
};
