/**
 * BẢN SAO NGUYÊN VĂN logic V1 của trang Helpdesk (trước A3-3) — dùng làm "oracle" để test V2 gửi đúng y như V1.
 * Nguồn: hooks/useHelpdeskPending.ts (fetchPending), sections/TicketListSection.tsx (setFilter, clearFilters,
 * hasActiveFilter, handleExportExcel, phân trang), components/admin/CronPanel.tsx (kẹp giờ/phút + body lưu),
 * components/import/ManualImportCard.tsx (kiểm JSON + body), sections/HelpdeskAdminPanel.tsx (OTP),
 * components/tickets/HelpdeskTicketRow.tsx (isPushed / isNeedsAttention).
 * KHÔNG sửa file này khi đổi V2 — nó mô tả hành vi V1.
 */
import type { PendingFilters, HelpdeskPendingItem } from '../../../types';
import { isCompletedTrangThai } from '../../../config/ticket-status';

export function v1PendingUrl(filters?: PendingFilters): string {
  const params = new URLSearchParams();
  if (filters?.search)    params.set('search',    filters.search);
  if (filters?.uuTien)    params.set('uuTien',    filters.uuTien);
  if (filters?.trangThai) params.set('trangThai', filters.trangThai);
  if (filters?.itSupport) params.set('itSupport', filters.itSupport);
  if (filters?.dateFrom)  params.set('dateFrom',  filters.dateFrom);
  if (filters?.dateTo)    params.set('dateTo',    filters.dateTo);
  if (filters?.page)      params.set('page',      String(filters.page));
  if (filters?.limit)     params.set('limit',     String(filters.limit));
  return `/api/integrations/helpdesk/unassigned?${params}`;
}

export function v1ExportUrl(filters: PendingFilters): string {
  const params = new URLSearchParams();
  if (filters.search)    params.set('search',    filters.search);
  if (filters.uuTien)    params.set('uuTien',    filters.uuTien);
  if (filters.trangThai) params.set('trangThai', filters.trangThai);
  if (filters.itSupport) params.set('itSupport', filters.itSupport);
  if (filters.dateFrom)  params.set('dateFrom',  filters.dateFrom);
  if (filters.dateTo)    params.set('dateTo',    filters.dateTo);
  params.set('export', 'xlsx');
  return `/api/integrations/helpdesk/unassigned?${params.toString()}`;
}

export const V1_INITIAL_FILTERS: PendingFilters = { limit: 25 };

export function v1SetFilter(prev: PendingFilters, key: keyof Omit<PendingFilters, 'page' | 'limit'>, value: string): PendingFilters {
  return { ...prev, [key]: value || undefined, page: undefined };
}
export function v1ClearFilters(prev: PendingFilters): PendingFilters {
  const pageSize = prev.limit ?? 25;
  return { limit: pageSize };
}
export function v1HasActiveFilter(filters: PendingFilters): boolean {
  return Object.keys(filters).some((k) => k !== 'page' && k !== 'limit' && filters[k as keyof PendingFilters]);
}
export function v1PageChange(prev: PendingFilters, p: number): PendingFilters { return { ...prev, page: p }; }
export function v1PageSizeChange(prev: PendingFilters, s: number): PendingFilters { return { ...prev, limit: s, page: undefined }; }

/** CronPanel: ô số → kẹp 0–23 / 0–59 rồi gửi nguyên 6 trường */
export const v1ClampHour = (raw: string) => Math.min(23, Math.max(0, Number(raw)));
export const v1ClampMinute = (raw: string) => Math.min(59, Math.max(0, Number(raw)));
export function v1CronBody(s: { enabled: boolean; hour: number; minute: number; enabled2: boolean; hour2: number; minute2: number }) {
  return JSON.stringify({ enabled: s.enabled, hour: s.hour, minute: s.minute, enabled2: s.enabled2, hour2: s.hour2, minute2: s.minute2 });
}
/** CronPanel khi chưa tải cấu hình */
export const V1_CRON_DEFAULT = { enabled: true, hour: 7, minute: 0, enabled2: false, hour2: 12, minute2: 0 };

/** ManualImportCard: nút tắt khi rỗng / JSON lỗi; gửi body { manualData: parsed } */
export function v1ImportBody(json: string): { disabled: true; parseError: boolean } | { disabled: false; body: string } {
  if (!json.trim()) return { disabled: true, parseError: false };
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return { disabled: true, parseError: true }; }
  return { disabled: false, body: JSON.stringify({ manualData: parsed }) };
}

/** HelpdeskAdminPanel: ô OTP chỉ giữ số, tối đa 6; nút xác nhận khi đủ 6 */
export const v1SanitizeOtp = (v: string) => v.replace(/\D/g, '').slice(0, 6);
export const v1ResetUrl = (otp: string) => `/api/integrations/helpdesk/reset?otp=${encodeURIComponent(otp)}`;

export function v1RowFlags(item: HelpdeskPendingItem) {
  const isPushed = item.status === 'PUSHED';
  const isCompleted = isCompletedTrangThai(item.trangThai);
  const isNeedsAttention = isCompleted && !item.itSupport && item.status === 'UNASSIGNED';
  return { isPushed, isCompleted, isNeedsAttention, selectable: !isPushed };
}
