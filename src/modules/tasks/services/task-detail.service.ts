import { prisma } from '@/lib/prisma';
import type { TaskDetail } from './task-query.service';

// ─── Session user shape ───────────────────────────────────────────────────────

interface SessionUser {
  id: string;
  displayName: string;
  role: { name: string };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const taskDetailService = {
  async getById(id: string, currentUser: SessionUser): Promise<TaskDetail | null> {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        priority: { select: { id: true, name: true, color: true, level: true } },
        type: { select: { id: true, name: true, color: true, icon: true } },
        creator: {
          select: {
            id: true,
            displayName: true,
            username: true,
            profile: { select: { avatarColor: true, avatarUrl: true } },
          },
        },
        // Override assignees to include per-assignee reports + attachments
        assignees: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                profile: { select: { avatarColor: true, avatarUrl: true } },
              },
            },
            reports: {
              select: {
                id: true,
                content: true,
                version: true,
                submittedAt: true,
                attachments: { select: { id: true, fileName: true, filePath: true, fileSize: true } },
              },
              orderBy: { version: 'asc' as const },
            },
          },
        },
        _count: { select: { comments: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            filePath: true,
            fileSize: true,
            uploadedBy: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            oldStatus: true,
            newStatus: true,
            details: true,
            createdAt: true,
            performedBy: { select: { id: true, displayName: true, username: true, role: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' as const },
          take: 50,
        },
        extensions: {
          select: {
            id: true,
            reason: true,
            requestedDate: true,
            status: true,
            responseNote: true,
            requester: { select: { id: true, displayName: true } },
          },
          orderBy: { createdAt: 'desc' as const },
        },
      },
    });

    if (!task) return null;

    // RLS: Employee can only view tasks they're involved in
    const isPrivileged = ['ADMIN', 'BOSS'].includes(currentUser.role.name);
    if (!isPrivileged) {
      const isCreator  = task.creatorId === currentUser.id;
      const isAssignee = task.assignees.some((a: { user: { id: string } }) => a.user.id === currentUser.id);
      if (!isCreator && !isAssignee) return null;
      if (isAssignee && !isCreator && task.status === 'PENDING_APPROVAL') return null;
    }

    return task as unknown as TaskDetail;
  },
};
