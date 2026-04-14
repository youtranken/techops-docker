import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

export type RoleWithCount = Role & { _count: { users: number } };

class RoleService {
  async list(): Promise<RoleWithCount[]> {
    return prisma.role.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string): Promise<Role> {
    const role = await prisma.role.findUnique({ where: { id } });

    if (!role) {
      const err = new Error('Role not found') as Error & { code: string };
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }

    return role;
  }
}

export const roleService = new RoleService();
