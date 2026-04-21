import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/completion-templates
 * Trả về danh sách template phù hợp với taskType của task.
 * Nếu task không có taskType → trả về tất cả template isActive.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const { id: taskId } = await params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { typeId: true },
  });
  if (!task) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Task không tồn tại' } }, { status: 404 });
  }

  const templates = await prisma.reportTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        { taskTypeId: null },           // template chung, không giới hạn loại task
        { taskTypeId: task.typeId },    // template đúng loại task này
      ],
    },
    orderBy: [{ taskTypeId: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, content: true, category: true },
  });

  return NextResponse.json({ data: templates });
}
