import { prisma } from '@/lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BottleneckTask {
  id: string;
  title: string;
  status: string;
  scheduleEnd: Date;
  extensionCount: number;
  priority: { name: string; color: string } | null;
  assignees: { user: { displayName: string } }[];
}

export interface WorkloadEntry {
  userId: string;
  displayName: string;
  username: string;
  inProgressCount: number;
  pendingCount: number;
  totalActive: number;
}

export interface OverdueTask {
  id: string;
  title: string;
  status: string;
  scheduleEnd: Date;
  daysOverdue: number;
  priority: { name: string; color: string } | null;
  assignees: { user: { id: string; displayName: string } }[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

class ResearchService {
  async getBottlenecks(): Promise<BottleneckTask[]> {
    const tasks = await prisma.task.findMany({
      where: {
        isDeleted: false,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] },
      },
      include: {
        priority: { select: { name: true, color: true } },
        assignees: { select: { user: { select: { displayName: true } } } },
        _count: { select: { extensions: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      scheduleEnd: t.scheduleEnd,
      extensionCount: t._count.extensions,
      priority: t.priority,
      assignees: t.assignees,
    }));
  }

  async getWorkloadBalance(): Promise<WorkloadEntry[]> {
    const assignees = await prisma.taskAssignee.findMany({
      where: {
        task: {
          isDeleted: false,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] },
        },
      },
      select: {
        userId: true,
        user: { select: { id: true, displayName: true, username: true } },
        task: { select: { status: true } },
      },
    });

    const userMap = new Map<
      string,
      { user: { id: string; displayName: string; username: string }; statuses: string[] }
    >();

    for (const a of assignees) {
      if (!userMap.has(a.userId)) {
        userMap.set(a.userId, { user: a.user, statuses: [] });
      }
      userMap.get(a.userId)!.statuses.push(a.task.status);
    }

    const result: WorkloadEntry[] = [];
    for (const [, { user, statuses }] of userMap) {
      const inProgressCount = statuses.filter((s) => s === 'IN_PROGRESS').length;
      const pendingCount = statuses.filter((s) =>
        ['WAITING_ACK', 'PENDING_APPROVAL', 'PENDING_REVIEW'].includes(s),
      ).length;

      result.push({
        userId: user.id,
        displayName: user.displayName,
        username: user.username,
        inProgressCount,
        pendingCount,
        totalActive: inProgressCount + pendingCount,
      });
    }

    return result.filter((u) => u.totalActive > 0).sort((a, b) => b.totalActive - a.totalActive);
  }

  async getOverdueTasks(): Promise<OverdueTask[]> {
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        isDeleted: false,
        scheduleEnd: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        priority: { select: { name: true, color: true } },
        assignees: { select: { user: { select: { id: true, displayName: true } } } },
      },
      orderBy: { scheduleEnd: 'asc' },
    });

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      scheduleEnd: t.scheduleEnd,
      daysOverdue: Math.floor(
        (now.getTime() - t.scheduleEnd.getTime()) / (1000 * 60 * 60 * 24),
      ),
      priority: t.priority,
      assignees: t.assignees,
    }));
  }
}

export const researchService = new ResearchService();
