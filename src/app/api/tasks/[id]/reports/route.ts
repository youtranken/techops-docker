import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateSameOrigin } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { createNotification, notifyBosses, formatTaskRef } from '@/modules/tasks/services/workflow/_shared';
import { z } from 'zod';
import { isOwnReportFilePath } from '@/lib/report-file-path';

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
 * Assignee bổ sung báo cáo khi task ở status IN_PROGRESS hoặc PENDING_REVIEW
 * (chỉ flow APPROVAL — DIRECT không có review nên không cần bổ sung).
 *
 * Sau khi Boss approve review → COMPLETED → KHÔNG bổ sung được nữa.
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

  // Bảo mật: chỉ nhận file đã upload vào thư mục reports của CHÍNH task này
  const badFile = parsed.data.files?.find((f) => !isOwnReportFilePath(taskId, f.filePath));
  if (badFile) {
    return NextResponse.json(
      { error: { code: 'INVALID_FILE_PATH', message: `Đường dẫn file không hợp lệ: ${badFile.fileName}` } },
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

  // Chỉ flow APPROVAL được phép bổ sung (DIRECT skip review)
  if (task.workflowMode !== 'NEED_APPROVAL') {
    return NextResponse.json(
      { error: { code: 'INVALID_FLOW', message: 'Chỉ task quy trình Phê duyệt mới có thể bổ sung báo cáo' } },
      { status: 400 },
    );
  }

  // Chỉ status IN_PROGRESS hoặc PENDING_REVIEW (sau COMPLETED không được nữa)
  if (!['IN_PROGRESS', 'PENDING_REVIEW'].includes(task.status)) {
    return NextResponse.json(
      { error: { code: 'INVALID_STATUS', message: 'Chỉ có thể bổ sung báo cáo khi task đang thực hiện hoặc chờ duyệt kết quả' } },
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

  // Chỉ assignee đã COMPLETED của riêng mình mới bổ sung được
  if (assignee.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: { code: 'NOT_COMPLETED', message: 'Bạn chưa hoàn thành báo cáo lần đầu — không thể bổ sung' } },
      { status: 400 },
    );
  }

  let major = 0;
  let minor = 0;
  let versionLabel = '';
  try {
    await prisma.$transaction(async (tx) => {
      // Bổ sung = giữ MAJOR hiện tại, tăng MINOR (V1.0 → V1.1 → V1.2)
      const lastReport = await tx.assigneeReport.findFirst({
        where: { assigneeId: assignee.id },
        orderBy: [{ version: 'desc' }, { minorVersion: 'desc' }],
      });
      major = lastReport?.version ?? 1;
      minor = (lastReport?.minorVersion ?? 0) + 1;
      versionLabel = `${major}.${minor}`;

      const report = await tx.assigneeReport.create({
        data: { assigneeId: assignee.id, content: parsed.data.content, version: major, minorVersion: minor },
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
          details: { reportVersion: versionLabel } as never,
        },
      });
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error('[supplement-report] Error:', e);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Lỗi khi bổ sung báo cáo' } },
      { status: 500 },
    );
  }

  // Notify creator + Boss/Admin (in-app + email tùy prefs Admin)
  try {
    const ref = formatTaskRef(task.taskCode, task.title);
    const supplementer = await prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true },
    });
    const name = supplementer?.displayName ?? 'Nhân viên';

    if (task.creatorId !== user.id) {
      await createNotification(
        task.creatorId,
        taskId,
        'REVIEW_REQUIRED',
        `Báo cáo bổ sung (v${versionLabel}): ${ref}`,
        `${name} đã bổ sung báo cáo cho công việc của bạn.`,
      );
    }
    await notifyBosses(
      taskId,
      'REVIEW_REQUIRED',
      `Báo cáo bổ sung (v${versionLabel}): ${ref}`,
      `${name} đã bổ sung báo cáo task "${task.title}".`,
    );
  } catch (notifyErr) {
    console.error('[supplement-report] notify failed:', notifyErr);
  }

  return NextResponse.json({ ok: true, version: versionLabel });
}
