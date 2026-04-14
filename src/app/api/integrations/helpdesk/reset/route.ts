import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  try {
    // Lay ids cua tat ca task tu helpdesk
    const tasks = await prisma.task.findMany({
      where: { hdNguonNhap: 'helpdesk' },
      select: { id: true },
    });
    const ids = tasks.map((t) => t.id);

    // Xoa theo thu tu phu thuoc
    const [logs, assignees] = await Promise.all([
      prisma.taskAuditLog.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskAssignee.deleteMany({ where: { taskId: { in: ids } } }),
    ]);

    const deletedTasks   = await prisma.task.deleteMany({ where: { id: { in: ids } } });
    const deletedPending = await prisma.helpdeskPendingTask.deleteMany();

    return NextResponse.json({
      tasks:        deletedTasks.count,
      pending:      deletedPending.count,
      auditLogs:    logs.count,
      assignees:    assignees.count,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: 'RESET_FAILED', message: err instanceof Error ? err.message : 'Reset that bai' } },
      { status: 500 },
    );
  }
}
