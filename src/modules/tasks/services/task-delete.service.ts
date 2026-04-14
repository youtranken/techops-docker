import { prisma } from '@/lib/prisma';

interface SessionUser {
  id: string;
  role: { name: string };
}

export async function deleteTask(id: string, currentUser: SessionUser) {
  if (currentUser.role.name !== 'ADMIN') throw new Error('PERMISSION_DENIED');

  const existing = await prisma.task.findUnique({ where: { id, isDeleted: false } });
  if (!existing) throw new Error('TASK_NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data:  { isDeleted: true, deletedAt: new Date() },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId:        id,
        action:        'TASK_DELETED',
        performedById: currentUser.id,
        oldStatus:     existing.status,
        details:       { reason: 'Admin soft delete' },
      },
    });
  });
}

export async function cancelTask(id: string, currentUser: SessionUser) {
  const existing = await prisma.task.findUnique({ where: { id, isDeleted: false } });
  if (!existing) throw new Error('TASK_NOT_FOUND');

  const role      = currentUser.role.name;
  const isCreator = existing.creatorId === currentUser.id;
  const canCancel =
    role === 'ADMIN' ||
    role === 'BOSS' ||
    (isCreator && ['DRAFT', 'PENDING_APPROVAL'].includes(existing.status));

  if (!canCancel) throw new Error('PERMISSION_DENIED');
  if (existing.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED');

  await prisma.$transaction(async (tx) => {
    await tx.task.update({ where: { id }, data: { status: 'CANCELLED' } });
    await tx.extensionRequest.updateMany({
      where: { taskId: id, status: 'PENDING' },
      data:  { status: 'REJECTED' },
    });
    await tx.taskAuditLog.create({
      data: {
        taskId:        id,
        action:        'TASK_CANCELLED',
        performedById: currentUser.id,
        oldStatus:     existing.status,
        newStatus:     'CANCELLED',
      },
    });
  });
}
