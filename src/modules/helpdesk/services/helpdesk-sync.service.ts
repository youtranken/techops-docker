import { normalizeTicket } from './ticket-normalizer';
import { ticketProcessorService } from './ticket-processor.service';
import type { HelpdeskTicket, SyncResult } from '../types';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Trả về prefix năm hiện tại: 2026 → "26", 2027 → "27" */
function currentYearPrefix(): string {
  return String(new Date().getFullYear()).slice(-2);
}

// ─── Service ──────────────────────────────────────────────────────────────────

class HelpdeskSyncService {
  /**
   * Fetch tickets từ real Helpdesk API.
   * Ném lỗi rõ ràng nếu chưa cấu hình token/url.
   */
  async fetchTickets(): Promise<HelpdeskTicket[]> {
    const token  = process.env.HELPDESK_BEARER_TOKEN ?? '';
    const apiUrl = process.env.HELPDESK_API_URL ?? '';

    if (!token || token === 'your-bearer-token-here') {
      throw new Error('HELPDESK_BEARER_TOKEN chưa được cấu hình trong .env');
    }
    if (!apiUrl || apiUrl.includes('yourcompany.com')) {
      throw new Error('HELPDESK_API_URL chưa được cấu hình trong .env');
    }

    console.log(`[HelpdeskSync] Fetching from: ${apiUrl}`);

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`API lỗi HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json() as { success?: boolean; data?: Record<string, unknown>[] };

    if (json.success === false) {
      throw new Error('API trả về success=false');
    }

    const raw = json.data ?? [];

    const all = raw.map(normalizeTicket);

    // Chỉ lấy ticket có Code bắt đầu bằng 2 chữ số năm hiện tại (26xx, 27xx, ...)
    const yearPrefix = currentYearPrefix();
    const filtered = all.filter(t => t.code?.startsWith(yearPrefix));

    console.log(`[HelpdeskSync] Sau filter năm "${yearPrefix}": ${filtered.length}/${all.length} records`);

    return filtered;
  }

  /** Main sync: fetch từ API → xử lý. */
  async sync(): Promise<SyncResult> {
    const tickets = await this.fetchTickets();
    return ticketProcessorService.processTickets(tickets);
  }

  /**
   * Sync từ dữ liệu thủ công (paste JSON từ Postman/browser).
   * Nhận dữ liệu dạng { success, data } hoặc mảng trực tiếp.
   * Không giới hạn số lượng.
   */
  async syncFromData(raw: unknown): Promise<SyncResult> {
    let rawArr: Record<string, unknown>[];

    if (Array.isArray(raw)) {
      rawArr = raw as Record<string, unknown>[];
    } else if (
      raw && typeof raw === 'object' && 'data' in raw &&
      Array.isArray((raw as { data: unknown }).data)
    ) {
      rawArr = (raw as { data: Record<string, unknown>[] }).data;
    } else {
      return {
        synced: 0, pending: 0, skipped: 0, fetchedCount: 0,
        errors: [{ code: 'INVALID_DATA', message: 'JSON phải là array hoặc { success, data: [...] }' }],
      };
    }

    const tickets = rawArr.map(normalizeTicket);
    return ticketProcessorService.processTickets(tickets, false);  // manual import: luôn upsert tất cả vào pending
  }
}

export const helpdeskSyncService = new HelpdeskSyncService();
