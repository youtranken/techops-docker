import { NextRequest, NextResponse } from 'next/server';
import { requireMenuPermission } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import type { TaskStatus, AssigneeStatus, Prisma } from '@prisma/client';

export type DrillDownType = 'overdue' | 'in_progress' | 'pending_review' | 'completed' | 'total';
const VALID_DRILL_DOWN_TYPES: DrillDownType[] = ['overdue', 'in_progress', 'pending_review', 'completed', 'total'];

export interface DrillDownTask {
  id: string;
  taskCode: string | null;
  title: string;
  status: string;
  scheduleEnd: string | null;
  creatorName: string;
  assigneeNames: string[];
  daysOverdue?: number;
}

export async function GET(req: NextRequest) {
  const user = await requireMenuPermission('analytics');
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') as DrillDownType | null;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (!type || !VALID_DRILL_DOWN_TYPES.includes(type)) {
    return NextResponse.json({ error: { code: 'INVALID_TYPE', message: 'Tham số type không hợp lệ' } }, { status: 400 });
  }

  const now = new Date();

  // Build where clause theo type
  const where: Prisma.TaskWhereInput = {};

  if (dateFrom && dateTo) {
    const from = dayjs(dateFrom).startOf('day').toDate();
    const to = dayjs(dateTo).endOf('day').toDate();
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: { code: 'INVALID_DATE', message: 'Định dạng ngày không hợp lệ' } }, { status: 400 });
    }
    if (type === 'completed') {
      where.completedAt = { gte: from, lte: to };
    } else {
      where.createdAt = { gte: from, lte: to };
    }
  }

  if (type === 'overdue') {
    where.status = { in: ['IN_PROGRESS', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE'] as TaskStatus[] };
    where.scheduleEnd = { lt: now };
  } else if (type === 'in_progress') {
    where.status = 'IN_PROGRESS' as TaskStatus;
  } else if (type === 'pending_review') {
    where.status = { in: ['PENDING_REVIEW', 'WAITING_ACKNOWLEDGE'] as TaskStatus[] };
  } else if (type === 'completed') {
    where.status = 'COMPLETED' as TaskStatus;
  }
  // 'total' — no additional filter

  const tasks = await prisma.task.findMany({
    where,
    include: {
      creator: { select: { displayName: true } },
      assignees: {
        where: { status: { notIn: ['TRANSFERRED', 'REJECTED'] as AssigneeStatus[] } },
        select: { user: { select: { displayName: true } } },
        take: 3,
      },
    },
    orderBy: type === 'overdue' ? { scheduleEnd: 'asc' } : { createdAt: 'desc' },
    take: 100,
  });

  const data: DrillDownTask[] = tasks.map((t) => ({
    id: t.id,
    taskCode: t.taskCode,
    title: t.title,
    status: t.status,
    scheduleEnd: t.scheduleEnd ? t.scheduleEnd.toISOString() : null,
    creatorName: t.creator.displayName,
    assigneeNames: t.assignees.map((a) => a.user.displayName),
    ...(type === 'overdue' && t.scheduleEnd
      ? { daysOverdue: Math.max(0, dayjs(now).diff(dayjs(t.scheduleEnd), 'day')) }
      : {}),
  }));

  return NextResponse.json({ data, total: data.length });
}
