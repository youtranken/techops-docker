import { prisma } from '@/lib/prisma';
import type { TaskRefFilters, TaskRefEntry } from '../types';
import type { PaginatedResult } from '@/lib/types/pagination';

export const taskReferenceService = {
  async getAll(filters: TaskRefFilters & { page: number; limit: number }): Promise<PaginatedResult<TaskRefEntry>> {
    const { search, creatorId, scheduleFrom, scheduleTo, page, limit } = filters;

    const where = {
      isDeleted: false,
      ...(search && {
        OR: [
          { taskCode: { contains: search, mode: 'insensitive' as const } },
          { title:    { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(creatorId && { creatorId }),
      ...(scheduleFrom && { scheduleStart: { gte: new Date(scheduleFrom) } }),
      ...(scheduleTo   && { scheduleEnd:   { lte: new Date(scheduleTo) } }),
    };

    const [total, rows] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          taskCode: true,
          title: true,
          status: true,
          scheduleStart: true,
          scheduleEnd: true,
          createdAt: true,
          creator: { select: { id: true, displayName: true, username: true } },
        },
      }),
    ]);

    return {
      data: rows.map((r) => ({
        ...r,
        status: r.status as string,
        scheduleStart: r.scheduleStart.toISOString(),
        scheduleEnd:   r.scheduleEnd.toISOString(),
        createdAt:     r.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },
};
