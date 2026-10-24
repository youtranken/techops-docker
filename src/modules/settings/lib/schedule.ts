/**
 * Lịch gửi email (Báo cáo định kỳ, Nhắc quá hạn) — giờ Việt Nam (UTC+7) như V1; 0 = Chủ nhật như cron V1.
 * Hành vi bấm giữ đúng V1 (DigestScheduleFields / OverdueReminderSection), test đối chiếu ở `__tests__/schedule-nav.test.ts`.
 */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAYS = [1, 2, 3, 4, 5];
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function toggleDay(days: number[], d: number): number[] {
  return days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
}

export function allWeekdays(days: number[]): boolean {
  return WEEKDAYS.every((d) => days.includes(d));
}

/** V1 "T2 – T6": đủ cả 5 ngày thì bỏ cả 5, ngược lại thêm những ngày còn thiếu */
export function toggleWeekdays(days: number[]): number[] {
  return allWeekdays(days) ? days.filter((d) => !WEEKDAYS.includes(d)) : Array.from(new Set([...days, ...WEEKDAYS]));
}

/** V1 Nhắc quá hạn: không cho bỏ mục cuối cùng */
export function toggleMin1<T>(current: T[], v: T): T[] {
  if (current.includes(v)) return current.length <= 1 ? current : current.filter((c) => c !== v);
  return [...current, v];
}

/** Phút chọn được (V1: 00/15/30/45); giá trị đang lưu khác bộ này vẫn hiện để không bị đổi ngầm */
export function minuteOptions(current: number): number[] {
  return MINUTES.includes(current) ? MINUTES : [...MINUTES, current].sort((a, b) => a - b);
}

/** Ngày đã chọn theo thứ tự T2 → CN */
export function scheduleDays(days: number[]): number[] {
  return DAY_ORDER.filter((d) => days.includes(d));
}
