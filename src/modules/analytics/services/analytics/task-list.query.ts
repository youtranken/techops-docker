import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import type { TaskListFilters, TaskListResponse, TaskListEmployee } from './types';

const ACTIVE_STATUSES = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'REVISION_REQUIRED'] as const;

export async function queryTaskList(filters: TaskListFilters): Promise<TaskListResponse> {
  const { dateFrom, dateTo, userId, search, sortBy = 'createdAt', sortOrder = 'desc', page, pageSize } = filters;

  const dateFilter = {
    ...(dateFrom && { gte: dateFrom }),
    ...(dateTo && { lte: dateTo }),
  };
  const taskBase = {
    ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    ...(search?.trim() && {
      OR: [
        { title: { contains: search.trim(), mode: 'insensitive' as const } },
        { taskCode: { contains: search.trim(), mode: 'insensitive' as const } },
      ],
    }),
  };

  const baseWhere = {
    user: { role: { name: 'EMPLOYEE' } },
    task: taskBase,
    ...(userId && { userId }),
  };

  // Build orderBy based on sortBy
  const orderBy = sortBy === 'scheduleEnd'
    ? [{ task: { scheduleEnd: sortOrder } }]
    : sortBy === 'title'
    ? [{ task: { title: sortOrder } }]
    : sortBy === 'status'
    ? [{ status: sortOrder }]
    : [{ task: { createdAt: sortOrder } }];

  const now = new Date();

  const [total, completed, inProgress, rejected, transferred, overdue, rows] = await Promise.all([
    prisma.taskAssignee.count({ where: baseWhere }),
    prisma.taskAssignee.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    prisma.taskAssignee.count({ where: { ...baseWhere, status: { in: [...ACTIVE_STATUSES] } } }),
    prisma.taskAssignee.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    prisma.taskAssignee.count({ where: { ...baseWhere, status: 'TRANSFERRED' } }),
    prisma.taskAssignee.count({
      where: {
        ...baseWhere,
        status: { in: [...ACTIVE_STATUSES] },
        task: { ...taskBase, scheduleEnd: { lt: now } },
      },
    }),
    prisma.taskAssignee.findMany({
      where: baseWhere,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        userId: true,
        status: true,
        acknowledgedAt: true,
        completedAt: true,
        user: { select: { id: true, displayName: true } },
        task: {
          select: {
            id: true,
            title: true,
            taskCode: true,
            scheduleEnd: true,
            createdAt: true,
            type: { select: { name: true, color: true } },
          },
        },
      },
    }),
  ]);

  const taskRows = rows.map((a) => {
    const receivedAt = a.acknowledgedAt ?? a.task.createdAt;
    const processingDays = a.completedAt
      ? Math.max(0, dayjs(a.completedAt).diff(dayjs(receivedAt), 'day'))
      : null;
    const isOnTime = a.completedAt != null
      ? !dayjs(a.completedAt).isAfter(dayjs(a.task.scheduleEnd).endOf('day'))
      : null;
    const isActiveStatus = (ACTIVE_STATUSES as readonly string[]).includes(a.status);
    const isOverdue = !a.completedAt && isActiveStatus && a.task.scheduleEnd < now;

    return {
      assigneeId: a.id,
      userId: a.userId,
      displayName: a.user.displayName,
      taskId: a.task.id,
      taskTitle: a.task.title,
      taskCode: a.task.taskCode,
      taskType: a.task.type.name,
      taskTypeColor: a.task.type.color,
      receivedAt: receivedAt.toISOString(),
      scheduleEnd: a.task.scheduleEnd.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      processingDays,
      isOnTime,
      isOverdue,
      status: a.status,
    };
  });

  return {
    rows: taskRows,
    total,
    kpi: { total, completed, inProgress, overdue, rejected, transferred },
  };
}

export async function queryTaskListEmployees(): Promise<TaskListEmployee[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { name: 'EMPLOYEE' } },
    select: { id: true, displayName: true, username: true },
    orderBy: { displayName: 'asc' },
  });
  return users;
}
