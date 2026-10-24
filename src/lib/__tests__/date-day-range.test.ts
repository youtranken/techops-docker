/**
 * Bộ lọc "đến ngày" ở Báo cáo: ô ngày gửi 'YYYY-MM-DD' → phải gồm trọn ngày đó theo giờ VN.
 * Lỗi V1: parseDate('2026-10-31') = 00:00 → việc tạo trong ngày cuối kỳ bị bỏ.
 */
import { describe, it, expect } from 'vitest';
import { parseDayStart, parseDayEnd } from '../date';

describe('parseDayStart / parseDayEnd (giờ VN, UTC+7)', () => {
  it('đầu ngày 00:00 VN', () => {
    expect(parseDayStart('2026-10-01')?.toISOString()).toBe('2026-09-30T17:00:00.000Z');
  });
  it('cuối ngày 23:59:59.999 VN', () => {
    expect(parseDayEnd('2026-10-31')?.toISOString()).toBe('2026-10-31T16:59:59.999Z');
  });
  it('rỗng / sai → undefined', () => {
    expect(parseDayStart(null)).toBeUndefined();
    expect(parseDayEnd('')).toBeUndefined();
    expect(parseDayEnd('abc')).toBeUndefined();
  });
  it('chuỗi có giờ (ISO đầy đủ) giữ nguyên thời điểm', () => {
    expect(parseDayEnd('2026-10-31T10:00:00.000Z')?.toISOString()).toBe('2026-10-31T10:00:00.000Z');
  });
});
