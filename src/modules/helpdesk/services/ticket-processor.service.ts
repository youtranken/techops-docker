import { prisma } from '@/lib/prisma';
import type { HelpdeskTicket, SyncResult } from '../types';
import { ticketTaskCreatorService, extractHdId } from './ticket-task-creator.service';
import { isCompletedTrangThai } from '../config/ticket-status';

// ─── Helper ────────────────────────────────────────────────────────────────────────────────

/**
 * Strip dấu tiếng Việt và lowercase — dùng để so sánh tên không phân biệt dấu.
 * Ví dụ: "Lê Minh" → "le minh", "Le Minh" → "le minh"
 */
function normalizeViName(s: string): string {
  return s
    .normalize('NFD')              // tách dấu thành combining chars
    .replace(/[\u0300-\u036f]/g, '') // xóa combining diacritics (dấu huyền, sắc, nặng...)
    .replace(/đ/g, 'd').replace(/Đ/g, 'D') // đ không split bằng NFD
    .toLowerCase()
    .trim();
}

type ActiveUser = { id: string; displayName: string };

/**
 * Tìm user theo tên IT Support với 3 mức.
 * S14: nhận activeUsers đã cache từ ngoài thay vì query lại mỗi lần.
 */
async function findUserByItSupport(itSupport: string, cachedUsers: ActiveUser[]) {
  // M7: treat empty string same as null — not assignable
  if (!itSupport.trim()) return null;

  // 1. Exact match
  const exact = cachedUsers.find((u) => u.displayName === itSupport);
  if (exact) return prisma.user.findUnique({ where: { id: exact.id } });

  // 2. Case-insensitive exact
  const lower = itSupport.toLowerCase();
  const caseInsensitive = cachedUsers.find((u) => u.displayName.toLowerCase() === lower);
  if (caseInsensitive) return prisma.user.findUnique({ where: { id: caseInsensitive.id } });

  // 3. Accent-normalized comparison
  const normalizedQuery = normalizeViName(itSupport);
  if (!normalizedQuery) return null;

  const matched = cachedUsers.find((u) => normalizeViName(u.displayName) === normalizedQuery);
  if (matched) return prisma.user.findUnique({ where: { id: matched.id } });

  return null;
}

// ─── Service ────────────────────────────────────────────────────────────────────────────────
class TicketProcessorService {
  /**
   * Xử lý danh sách tickets — skip trùng (chỉ khi skipExisting=true), tạo Task hoặc Pending.
   * Chỉ ticket có trangThai hoàn thành ('Completed' / 'Hoàn thành') mới được tạo Task tự động.
   * Các trạng thái khác chỉ upsert vào helpdeskPendingTask để hiển thị trong Danh sách ticket.
   */
  async processTickets(tickets: HelpdeskTicket[], skipExisting = true): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, pending: 0, skipped: 0, fetchedCount: tickets.length, errors: [] };

    // S14: load active users once — reused for every ticket's findUserByItSupport call
    const cachedActiveUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, displayName: true },
    });

    for (const ticket of tickets) {
      let hdId = '';
      try {
        hdId = ticket.code || extractHdId(ticket.tieuDe, ticket.timeStamp ?? undefined);

        if (skipExisting) {
          const [existingByCode, existingTask] = await Promise.all([
            ticket.code ? prisma.task.findUnique({ where: { hdCode: `API-${ticket.code}` } }) : Promise.resolve(null),
            prisma.task.findUnique({ where: { hdId } }),
          ]);
          if (existingByCode || existingTask) { result.skipped++; continue; }
        }

        const isCompleted = isCompletedTrangThai(ticket.trangThai);

        if (!isCompleted) {
          await ticketTaskCreatorService.createPendingTask(ticket, hdId);
          result.pending++;
        } else {
          const [existingByCode, existingTask] = await Promise.all([
            ticket.code ? prisma.task.findUnique({ where: { hdCode: `API-${ticket.code}` } }) : Promise.resolve(null),
            prisma.task.findUnique({ where: { hdId } }),
          ]);
          const alreadyHasTask = !!(existingByCode || existingTask);

          if (alreadyHasTask) {
            await ticketTaskCreatorService.createPendingTask(ticket, hdId, 'PUSHED');
            result.skipped++;
          } else if (!ticket.itSupport) {
            const boss = await prisma.user.findFirst({ where: { role: { name: 'BOSS' }, isActive: true } });
            if (boss) {
              try {
                await ticketTaskCreatorService.createTask(ticket, hdId, boss.id);
                await ticketTaskCreatorService.createPendingTask(ticket, hdId, 'PUSHED');
                result.synced++;
              } catch (taskErr: unknown) {
                const msg = taskErr instanceof Error ? taskErr.message : 'Unknown';
                console.error(`[HelpdeskSync] createTask FAILED (boss) hdId=${hdId}:`, msg);
                await ticketTaskCreatorService.createPendingTask(ticket, hdId);
                result.errors.push({ code: 'TASK_CREATE_FAILED', message: msg, hdId });
              }
            } else {
              await ticketTaskCreatorService.createPendingTask(ticket, hdId);
              result.pending++;
            }
          } else {
            const assignee = await findUserByItSupport(ticket.itSupport, cachedActiveUsers);
            if (!assignee) {
              console.warn(`[HelpdeskSync] IT Support "${ticket.itSupport}" không tìm thấy → UNASSIGNED`);
              await ticketTaskCreatorService.createPendingTask(ticket, hdId);
              result.pending++;
            } else {
              try {
                await ticketTaskCreatorService.createTask(ticket, hdId, assignee.id);
                await ticketTaskCreatorService.createPendingTask(ticket, hdId, 'PUSHED');
                result.synced++;
              } catch (taskErr: unknown) {
                const msg = taskErr instanceof Error ? taskErr.message : 'Unknown';
                console.error(`[HelpdeskSync] createTask FAILED itSupport="${ticket.itSupport}" hdId=${hdId}:`, msg);
                await ticketTaskCreatorService.createPendingTask(ticket, hdId);
                result.errors.push({ code: 'TASK_CREATE_FAILED', message: msg, hdId });
              }
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[HelpdeskSync] TICKET_ERROR hdId=${hdId}:`, msg);
        result.errors.push({ code: 'TICKET_ERROR', message: msg, hdId });
      }
    }
    return result;
  }

  /**
   * Tạo Task từ một HelpdeskPendingTask record.
   * Dùng khi push thủ công từ trang Helpdesk.
   * PUBLIC — được gọi từ push-to-tasks/route.ts.
   * Delegate to ticketTaskCreatorService.
   */
  async createTaskFromPending(
    pending: {
      hdId: string;
      tieuDe: string;
      dienGiai: string;
      uuTien: string;
      loaiYeuCau: string;
      nhanVien: string;
      phongBan: string;
      thoiGian: Date;
      itSupport: string | null;
      ngayHoanThanh: Date | null;
    },
    assigneeId: string,
  ): Promise<void> {
    return ticketTaskCreatorService.createTaskFromPending(pending, assigneeId);
  }
}

export const ticketProcessorService = new TicketProcessorService();
