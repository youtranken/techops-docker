import { NextRequest, NextResponse } from 'next/server';
import { requireRole, validateSameOrigin } from '@/lib/auth-utils';
import { ticketProcessorService } from '@/modules/helpdesk/services/ticket-processor.service';
import { prisma } from '@/lib/prisma';
import { COMPLETED_TRANG_THAI } from '@/modules/helpdesk/config/ticket-status';

/**
 * POST /api/integrations/helpdesk/push-to-tasks
 * Day tat ca HelpdeskPendingTask co IT Support sang Task.
 */
export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN', 'BOSS']);
  if (user instanceof NextResponse) return user;

  if (!validateSameOrigin(req)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid origin' } }, { status: 403 });

  try {
    // Lay tat ca ticket Completed co IT Support
    // Lay tat ca ticket Completed co IT Support (ca UNASSIGNED lan PUSHED)
    const pendingWithSupport = await prisma.helpdeskPendingTask.findMany({
      where: { itSupport: { not: null }, trangThai: { in: [...COMPLETED_TRANG_THAI] } },
    });

    let pushed = 0;
    let skipped = 0;
    let noUser = 0;
    const errors: Array<{ hdId: string; message: string }> = [];

    for (const pending of pendingWithSupport) {
      try {
        const hdCode = `API-${pending.hdId}`;
        // Check trung theo hdCode — neu da co Task roi thi skip
        const existing = await prisma.task.findUnique({ where: { hdCode } });
        if (existing) { skipped++; continue; }

        // Tìm user theo tên IT Support
        const assignee = await prisma.user.findFirst({
          where: { displayName: pending.itSupport!, isActive: true },
        });
        if (!assignee) {
          console.warn(`[PushToTasks] IT Support "${pending.itSupport}" không tìm thấy → bỏ qua`);
          noUser++;
          continue;
        }

        await ticketProcessorService.createTaskFromPending(pending, assignee.id);
        pushed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ hdId: pending.hdId, message: msg });
      }
    }

    return NextResponse.json({ pushed, skipped, noUser, errors, total: pendingWithSupport.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
