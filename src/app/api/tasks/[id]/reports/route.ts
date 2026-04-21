import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const supplementSchema = z.object({
  content: z.string().min(1, 'Nội dung không được để trống').max(10000),
  files: z.array(z.object({
    fileName: z.string().min(1),
    filePath: z.string().min(1),
    fileSize: z.number().positive(),
  })).max(3).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/reports
 * Assignee bổ sung báo cáo sau khi task đã COMPLETED hoặc PENDING_REVIEW.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });
  }

  const { id: taskId } = await params;

  const body = await req.json();
  const parsed = supplementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' } },
      { status: 400 },
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignees: {
        where: { userId: user.id },
        select: { id: true, status: true },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Công việc không tồn tại' } }, { status: 404 });
  }

  // Chỉ cho phép bổ sung khi task đã hoàn thành hoặc đang chờ review
  if (!['COMPLETED', 'PENDING_REVIEW'].includes(task.status)) {
    return NextResponse.json(
      { error: { code: 'INVALID_STATUS', message: 'Chỉ có thể bổ sung báo cáo khi task đã hoàn thành hoặc đang chờ review' } },
      { status: 400 },
    );
  }

  const assignee = task.assignees[0];
  if (!assignee) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Bạn không phải người thực hiện của công việc này' } },
      { status: 403 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const lastReport = await tx.assigneeReport.findFirst({
        where: { assigneeId: assignee.id },
        orderBy: { version: 'desc' },
      });
      const version = (lastReport?.version ?? 0) + 1;

      const report = await tx.assigneeReport.create({
        data: { assigneeId: assignee.id, content: parsed.data.content, version },
      });

      if (parsed.data.files && parsed.data.files.length > 0) {
        await tx.reportAttachment.createMany({
          data: parsed.data.files.map((f) => ({
            reportId: report.id,
            fileName: f.fileName,
            filePath: f.filePath,
            fileSize: f.fileSize,
          })),
        });
      }

      await tx.taskAuditLog.create({
        data: {
          taskId,
          performedById: user.id,
          action: 'REPORT_SUPPLEMENTED',
          oldStatus: task.status,
          newStatus: task.status,
          details: { reportVersion: version } as never,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error('[supplement-report] Error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Lỗi khi bổ sung báo cáo' } },
      { status: 500 },
    );
  }
}
