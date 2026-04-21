import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { getRedis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/integrations/helpdesk/reset?otp=XXXXXX
 * Xóa toàn bộ task helpdesk và pending list.
 * Yêu cầu OTP đã được gửi qua email trước đó.
 */
export async function DELETE(req: NextRequest) {
  const user = await requireRole(['ADMIN']);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(req.url);
  const otp = searchParams.get('otp')?.trim();

  if (!otp) {
    return NextResponse.json({ error: { code: 'OTP_REQUIRED', message: 'Cần nhập mã OTP xác nhận' } }, { status: 400 });
  }

  const redis = getRedis();
  const storedOtp = await redis.get(`helpdesk_reset_otp:${user.id}`);

  if (!storedOtp || storedOtp !== otp) {
    return NextResponse.json({ error: { code: 'OTP_INVALID', message: 'Mã OTP không đúng hoặc đã hết hạn' } }, { status: 400 });
  }

  // Consume OTP immediately
  await redis.del(`helpdesk_reset_otp:${user.id}`);

  try {
    const tasks = await prisma.task.findMany({
      where: { hdNguonNhap: 'helpdesk' },
      select: { id: true },
    });
    const ids = tasks.map((t) => t.id);

    const [logs, assignees] = await Promise.all([
      prisma.taskAuditLog.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskAssignee.deleteMany({ where: { taskId: { in: ids } } }),
    ]);

    const deletedTasks   = await prisma.task.deleteMany({ where: { id: { in: ids } } });
    const deletedPending = await prisma.helpdeskPendingTask.deleteMany();

    return NextResponse.json({
      tasks:     deletedTasks.count,
      pending:   deletedPending.count,
      auditLogs: logs.count,
      assignees: assignees.count,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: 'RESET_FAILED', message: err instanceof Error ? err.message : 'Reset thất bại' } },
      { status: 500 },
    );
  }
}
