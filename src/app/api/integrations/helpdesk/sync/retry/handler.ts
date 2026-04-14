import { prisma } from '@/lib/prisma';
import { ticketProcessorService } from '@/modules/helpdesk/services/ticket-processor.service';

export interface RetryResult {
  retried:  number;
  synced:   number;
  skipped:  number;
  errors:   Array<{ hdId: string; message: string }>;
}

export async function retryHelpdeskTickets(hdIds: string[]): Promise<RetryResult> {
  const result: RetryResult = { retried: 0, synced: 0, skipped: 0, errors: [] };

  for (const hdId of hdIds) {
    try {
      const pending = await prisma.helpdeskPendingTask.findUnique({ where: { hdId } });

      if (!pending) {
        result.errors.push({ hdId, message: 'Không tìm thấy ticket trong DB' });
        continue;
      }

      if (pending.status === 'PUSHED') {
        result.skipped++;
        continue;
      }

      result.retried++;

      // Tìm assignee: itSupport → BOSS fallback
      const assignee = pending.itSupport
        ? await prisma.user.findFirst({
            where: { displayName: pending.itSupport, isActive: true },
          })
        : null;

      const boss = await prisma.user.findFirst({
        where: { role: { name: 'BOSS' }, isActive: true },
      });

      const finalAssignee = assignee ?? boss;
      if (!finalAssignee) {
        result.errors.push({ hdId, message: 'Không tìm thấy user nào để gán' });
        continue;
      }

      await ticketProcessorService.createTaskFromPending(
        {
          hdId:          pending.hdId,
          tieuDe:        pending.tieuDe,
          dienGiai:      pending.dienGiai,
          uuTien:        pending.uuTien,
          loaiYeuCau:    pending.loaiYeuCau,
          nhanVien:      pending.nhanVien,
          phongBan:      pending.phongBan,
          thoiGian:      pending.thoiGian,
          itSupport:     pending.itSupport,
          ngayHoanThanh: pending.ngayHoanThanh,
        },
        finalAssignee.id,
      );

      await prisma.helpdeskPendingTask.update({
        where: { hdId },
        data:  { status: 'PUSHED' },
      });

      result.synced++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      result.errors.push({ hdId, message: msg });
    }
  }

  return result;
}
