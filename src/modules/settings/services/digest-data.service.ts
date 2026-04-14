import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import type { DigestContentType } from '../types';

export interface DeadlineSoonTask {
  id: string; title: string; assigneeName: string; daysLeft: number; deadline: string;
}
export interface InProgressTask {
  id: string; title: string; assigneeName: string; startedAt: string;
}
export interface OverdueTask {
  id: string; title: string; assigneeName: string; daysOverdue: number; deadline: string;
}
export interface PendingApprovalTask {
  id: string; title: string; requesterName: string; submittedAt: string;
}
export interface EmployeeSummary {
  name: string; inProgress: number; completed: number; overdue: number;
}

export interface DigestData {
  deadlineSoon: DeadlineSoonTask[];
  inProgress: InProgressTask[];
  overdue: OverdueTask[];
  pendingApproval: PendingApprovalTask[];
  summaryByEmployee: EmployeeSummary[];
}

export async function collectDigestData(contentTypes: DigestContentType[]): Promise<DigestData> {
  const now = dayjs();
  const in2Days = now.add(2, 'day').toDate();
  const has = (t: DigestContentType) => contentTypes.includes(t);

  const [deadlineSoon, inProgress, overdue, pendingApproval, summaryRaw] = await Promise.all([
    // 1. Deadline soon (within 2 days)
    has('DEADLINE_SOON') ? prisma.taskAssignee.findMany({
      where: {
        status: 'IN_PROGRESS',
        task: { isDeleted: false, scheduleEnd: { gte: now.toDate(), lte: in2Days } },
      },
      include: { task: { select: { id: true, title: true, scheduleEnd: true } }, user: { select: { displayName: true } } },
      orderBy: { task: { scheduleEnd: 'asc' } },
    }) : Promise.resolve([]),

    // 2. In progress
    has('IN_PROGRESS') ? prisma.taskAssignee.findMany({
      where: { status: 'IN_PROGRESS', task: { isDeleted: false } },
      include: { task: { select: { id: true, title: true, updatedAt: true } }, user: { select: { displayName: true } } },
      orderBy: { task: { updatedAt: 'desc' } },
      take: 20,
    }) : Promise.resolve([]),

    // 3. Overdue
    has('OVERDUE') ? prisma.taskAssignee.findMany({
      where: {
        status: 'IN_PROGRESS',
        task: { isDeleted: false, scheduleEnd: { lt: now.toDate() } },
      },
      include: { task: { select: { id: true, title: true, scheduleEnd: true } }, user: { select: { displayName: true } } },
      orderBy: { task: { scheduleEnd: 'asc' } },
    }) : Promise.resolve([]),

    // 4. Pending approval
    has('PENDING_APPROVAL') ? prisma.task.findMany({
      where: { isDeleted: false, status: { in: ['PENDING_APPROVAL', 'PENDING_REVIEW'] } },
      include: { assignees: { include: { user: { select: { displayName: true } } }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }) : Promise.resolve([]),

    // 5. Summary by employee
    has('SUMMARY_BY_EMPLOYEE') ? prisma.user.findMany({
      where: { isActive: true, role: { name: 'EMPLOYEE' } },
      select: {
        displayName: true,
        assignments: {
          where: { task: { isDeleted: false } },
          select: { status: true, task: { select: { scheduleEnd: true } } },
        },
      },
    }) : Promise.resolve([]),
  ]);

  return {
    deadlineSoon: deadlineSoon.map((a) => ({
      id: a.task.id,
      title: a.task.title,
      assigneeName: a.user.displayName,
      daysLeft: Math.max(0, dayjs(a.task.scheduleEnd!).diff(now, 'day')),
      deadline: dayjs(a.task.scheduleEnd!).format('DD/MM/YYYY'),
    })),

    inProgress: inProgress.map((a) => ({
      id: a.task.id,
      title: a.task.title,
      assigneeName: a.user.displayName,
      startedAt: dayjs(a.task.updatedAt).format('DD/MM/YYYY'),
    })),

    overdue: overdue.map((a) => ({
      id: a.task.id,
      title: a.task.title,
      assigneeName: a.user.displayName,
      daysOverdue: Math.abs(dayjs(a.task.scheduleEnd!).diff(now, 'day')),
      deadline: dayjs(a.task.scheduleEnd!).format('DD/MM/YYYY'),
    })),

    pendingApproval: pendingApproval.map((t) => ({
      id: t.id,
      title: t.title,
      requesterName: t.assignees[0]?.user.displayName ?? '—',
      submittedAt: dayjs(t.updatedAt).format('DD/MM/YYYY'),
    })),

    summaryByEmployee: (summaryRaw as Awaited<typeof summaryRaw>).map((u) => {
      const assignees = u.assignments;
      return {
        name: u.displayName,
        inProgress: assignees.filter((a: { status: string }) => a.status === 'IN_PROGRESS').length,
        completed: assignees.filter((a: { status: string }) => a.status === 'COMPLETED').length,
        overdue: assignees.filter((a: { status: string; task: { scheduleEnd: Date | null } }) =>
          a.status === 'IN_PROGRESS' && a.task.scheduleEnd && dayjs(a.task.scheduleEnd).isBefore(now),
        ).length,
      };
    }).filter((e: { inProgress: number; completed: number; overdue: number }) =>
      e.inProgress + e.completed + e.overdue > 0
    ),
  };
}
