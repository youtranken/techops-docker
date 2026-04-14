import { TaskAction, UserAction, TaskStatus } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Create a task audit log entry
 */
export async function logTaskAction(params: {
  taskId?: string;
  action: TaskAction;
  performedById: string;
  oldStatus?: TaskStatus;
  newStatus?: TaskStatus;
  details?: Record<string, any>;
}) {
  return prisma.taskAuditLog.create({
    data: {
      taskId: params.taskId,
      action: params.action,
      performedById: params.performedById,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      details: params.details,
    },
  });
}

/**
 * Create a user activity log entry
 */
export async function logUserActivity(params: {
  userId: string;
  action: UserAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  return prisma.userActivityLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    },
  });
}
