import { prisma } from '@/lib/prisma';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginatedResult } from '@/lib/types/pagination';
import type { UserWithRole, UserWithRoleAndTasks, ListUsersFilters } from '../types';

type OrFilter = { username?: { contains: string; mode: 'insensitive' }; displayName?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } };
type WhereClause = {
  OR?: OrFilter[];
  roleId?: string;
  isActive?: boolean;
  role?: { name: { in: string[] } };
  createdAt?: { gte?: Date; lte?: Date };
};

function buildWhere(filters: ListUsersFilters): WhereClause {
  const where: WhereClause = {};

  if (filters.search) {
    where.OR = [
      { username: { contains: filters.search, mode: 'insensitive' } },
      { displayName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.roleId) where.roleId = filters.roleId;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {
      ...(filters.createdFrom ? { gte: new Date(filters.createdFrom) } : {}),
      ...(filters.createdTo   ? { lte: new Date(filters.createdTo + 'T23:59:59.999Z') } : {}),
    };
  }

  return where;
}

const USER_INCLUDE = {
  role: true,
  profile: { select: { avatarUrl: true, avatarColor: true } },
  _count: { select: { createdTasks: true, assignments: true } },
} as const;

class UserQueryService {
  async list(filters: ListUsersFilters = {}): Promise<PaginatedResult<UserWithRoleAndTasks>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;
    const where = buildWhere(filters);

    const [rawData, total] = await Promise.all([
      prisma.user.findMany({ where, include: USER_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);

    const data: UserWithRoleAndTasks[] = rawData.map(({ _count, ...u }) => ({
      ...u,
      hasTasks: _count.createdTasks > 0 || _count.assignments > 0,
    }));

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listForEmployee(actorId: string, filters: ListUsersFilters = {}): Promise<PaginatedResult<UserWithRoleAndTasks>> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;
    const where: WhereClause & { role?: { name: { in: string[] } } } = {
      ...buildWhere(filters),
      // EMPLOYEE chỉ thấy EMPLOYEE khác và chính mình
      role: { name: { in: ['EMPLOYEE'] } },
    };

    const [rawData, total] = await Promise.all([
      prisma.user.findMany({ where, include: USER_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);

    const data: UserWithRoleAndTasks[] = rawData.map(({ _count, ...u }) => ({
      ...u,
      hasTasks: _count.createdTasks > 0 || _count.assignments > 0,
    }));

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string): Promise<UserWithRole> {
    const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) {
      const err = new Error('User not found') as Error & { code: string };
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    return user;
  }
}

export const userQueryService = new UserQueryService();
