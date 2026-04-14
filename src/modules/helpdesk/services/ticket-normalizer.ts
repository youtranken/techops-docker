import type { HelpdeskTicket } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip non-ASCII chars to compare without encoding dependency */
function stripNonAscii(s: string): string {
  return s.replace(/[^\x00-\x7F]/g, '?').toLowerCase();
}

// ─── Public ───────────────────────────────────────────────────────────────────

/**
 * Chuyển từ raw API object (bất kỳ encoding nào) sang HelpdeskTicket nội bộ.
 * Hỗ trợ cả key có dấu và không dấu, TimeStamp và timeStamp.
 * Fuzzy fallback: strip non-ASCII rồi so sánh.
 */
export function normalizeTicket(raw: Record<string, unknown>): HelpdeskTicket {
  const rawKeys = Object.keys(raw);

  // Tìm giá trị: ưu tiên exact keys, fallback fuzzy
  const find = (...exactKeys: string[]): string | null => {
    // 1. Exact match
    for (const k of exactKeys) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    // 2. Fuzzy: so sánh strip non-ASCII
    const targets = exactKeys.map(stripNonAscii);
    for (const rk of rawKeys) {
      const rkStripped = stripNonAscii(rk);
      if (targets.includes(rkStripped)) {
        const v = raw[rk];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
    }
    return null;
  };

  const get         = (...keys: string[]): string       => find(...keys) ?? '';
  const getNullable = (...keys: string[]): string | null => find(...keys);

  return {
    code:       get('Code', 'code'),
    ngayTao:    get('Ngày tạo', 'Ngay tao', 'ngayTao', 'NgayTao'),
    nhanVien:   get('Nhân viên', 'Nhan vien', 'nhanVien'),
    phongBan:   get('Phòng ban', 'Phong ban', 'phongBan'),
    tieuDe:     get('Tiêu đề', 'Tieu de', 'tieuDe'),
    loaiYeuCau: get('Loại yêu cầu', 'Loai yeu cau', 'loaiYeuCau'),
    uuTien:     get('Ưu tiên', 'Uu tien', 'uuTien'),
    dienGiai:   get('Diễn giải', 'Dien giai', 'dienGiai'),
    trangThai:  get('Trạng thái', 'Trang thai', 'trangThai'),
    itSupport:  getNullable('IT Support', 'ITSupport', 'itSupport'),
    timeStamp:  getNullable('TimeStamp', 'timeStamp', 'Timestamp', 'timestamp'),
  };
}
