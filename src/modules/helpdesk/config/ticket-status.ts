// ─── Trạng thái ticket từ Helpdesk API ────────────────────────────────────────
// API từng trả tiếng Anh ('Completed'), hiện trả tiếng Việt ('Hoàn thành') → nhận cả hai.
// Không import gì — dùng được cả client lẫn server.

/** Các giá trị trangThai được coi là ticket đã hoàn thành (dùng cho Prisma `in`) */
export const COMPLETED_TRANG_THAI = ['Completed', 'Hoàn thành'] as const;

const COMPLETED_NORMALIZED = COMPLETED_TRANG_THAI.map((s) => s.normalize('NFC').toLowerCase());

export function isCompletedTrangThai(trangThai: string | null | undefined): boolean {
  if (!trangThai) return false;
  return COMPLETED_NORMALIZED.includes(trangThai.normalize('NFC').trim().toLowerCase());
}
