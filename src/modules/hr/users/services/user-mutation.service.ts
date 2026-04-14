import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { UserWithRole, CreateUserInput, UpdateUserInput } from '../types';
import { userQueryService } from './user-query.service';

class UserMutationService {
  async create(data: CreateUserInput, performedById: string): Promise<UserWithRole> {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.username },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
    });

    if (existing) {
      const err = new Error('Username or email already exists') as Error & { code: string };
      err.code = 'USER_DUPLICATE';
      throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        email: data.email || null,
        password: hashedPassword,
        roleId: data.roleId,
        isActive: true,
      },
      include: { role: true },
    });

    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'CREATE_USER',
        metadata: { targetUserId: user.id, username: user.username } },
    });

    return user;
  }

  async update(id: string, data: UpdateUserInput, performedById: string): Promise<UserWithRole> {
    await userQueryService.getById(id);

    type PatchData = {
      displayName?: string;
      email?: string | null;
      roleId?: string;
      isActive?: boolean;
      password?: string;
    };
    const patch: PatchData = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.email !== undefined) patch.email = data.email || null;
    if (data.roleId !== undefined) patch.roleId = data.roleId;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.password) patch.password = await bcrypt.hash(data.password, 10);

    let user: UserWithRole;
    try {
      user = await prisma.user.update({ where: { id }, data: patch, include: { role: true } });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        const dupErr = new Error('Email đã được sử dụng bởi tài khoản khác') as Error & { code: string };
        dupErr.code = 'USER_DUPLICATE';
        throw dupErr;
      }
      throw err;
    }

    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'UPDATE_USER',
        metadata: { targetUserId: id, changes: Object.keys(data) } },
    });

    return user;
  }

  async deactivate(id: string, performedById: string): Promise<UserWithRole> {
    await userQueryService.getById(id);
    const user = await prisma.user.update({
      where: { id }, data: { isActive: false }, include: { role: true },
    });
    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'UPDATE_USER', metadata: { targetUserId: id, action: 'deactivate' } },
    });
    return user;
  }

  async deleteHard(id: string, performedById: string): Promise<UserWithRole> {
    await userQueryService.getById(id);

    const taskCount = await prisma.task.count({
      where: { OR: [{ creatorId: id }, { assignees: { some: { userId: id } } }] },
    });

    if (taskCount > 0) {
      const err = new Error(
        'Không thể xóa: người dùng đã có task liên quan. Hãy dùng Vô hiệu hóa.',
      ) as Error & { code: string };
      err.code = 'USER_HAS_TASKS';
      throw err;
    }

    const deleted = await prisma.user.delete({ where: { id }, include: { role: true } });

    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'DELETE_USER',
        metadata: { targetUserId: id, username: deleted.username } },
    });

    return deleted;
  }

  async resetPassword(id: string, newPassword: string, performedById: string): Promise<void> {
    await userQueryService.getById(id);
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    await prisma.userActivityLog.create({
      data: { userId: performedById, action: 'RESET_PASSWORD', metadata: { targetUserId: id } },
    });
  }

  async bulkDeactivate(ids: string[], performedById: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
      await tx.userActivityLog.createMany({
        data: ids.map((targetUserId) => ({
          userId: performedById, action: 'DEACTIVATE_USER' as const, metadata: { targetUserId },
        })),
      });
    });
  }

  async bulkActivate(ids: string[], performedById: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { isActive: true } });
      await tx.userActivityLog.createMany({
        data: ids.map((targetUserId) => ({
          userId: performedById, action: 'ACTIVATE_USER' as const, metadata: { targetUserId },
        })),
      });
    });
  }
    }

export const userMutationService = new UserMutationService();
