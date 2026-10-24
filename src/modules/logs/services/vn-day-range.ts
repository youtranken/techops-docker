/**
 * Khoảng ngày theo giờ VN (UTC+7) cho bộ lọc Nhật ký.
 * Ô ngày gửi 'YYYY-MM-DD'; route tasks parse thành Date (nửa đêm UTC) — cả hai đều lấy phần ngày.
 */
const VN_OFFSET = '+07:00';

function ymd(d: string | Date): string {
  return (typeof d === 'string' ? d : d.toISOString()).slice(0, 10);
}

export function vnDayStart(d: string | Date): Date {
  return new Date(`${ymd(d)}T00:00:00.000${VN_OFFSET}`);
}

export function vnDayEnd(d: string | Date): Date {
  return new Date(`${ymd(d)}T23:59:59.999${VN_OFFSET}`);
}
