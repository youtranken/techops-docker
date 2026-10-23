import { describe, it, expect } from 'vitest';
import { dueTone, dueInfo, dayDiffInZone, APP_TIMEZONE } from '../due';

// "Bây giờ" = 23/10/2026 10:00 giờ VN (03:00 UTC)
const NOW = new Date('2026-10-23T03:00:00Z');
const at = (isoLocal: string) => new Date(`${isoLocal}+07:00`);

describe('APP_TIMEZONE', () => {
  it('mặc định Asia/Bangkok (UTC+7, giống lib/date)', () => {
    expect(APP_TIMEZONE).toBe('Asia/Bangkok');
  });
});

describe('dayDiffInZone — đếm theo ngày lịch ở múi giờ app', () => {
  it('cùng ngày VN = 0 dù khác ngày UTC', () => {
    // 23/10 00:30 VN = 22/10 17:30 UTC
    expect(dayDiffInZone(at('2026-10-23T00:30:00'), NOW)).toBe(0);
  });
  it('23:59 hôm qua (VN) = -1', () => {
    expect(dayDiffInZone(at('2026-10-22T23:59:00'), NOW)).toBe(-1);
  });
  it('00:00 ngày mai (VN) = 1', () => {
    expect(dayDiffInZone(at('2026-10-24T00:00:00'), NOW)).toBe(1);
  });
});

describe('dueTone', () => {
  it('không có hạn → none', () => {
    expect(dueTone(null, NOW, 'IN_PROGRESS')).toBe('none');
    expect(dueTone(undefined, NOW, 'IN_PROGRESS')).toBe('none');
  });
  it('quá hạn → overdue', () => {
    expect(dueTone(at('2026-10-20T17:00:00'), NOW, 'IN_PROGRESS')).toBe('overdue');
  });
  it('hôm nay, ngày mai, còn ≤3 ngày → soon', () => {
    expect(dueTone(at('2026-10-23T17:00:00'), NOW, 'IN_PROGRESS')).toBe('soon');
    expect(dueTone(at('2026-10-24T17:00:00'), NOW, 'IN_PROGRESS')).toBe('soon');
    expect(dueTone(at('2026-10-26T17:00:00'), NOW, 'WAITING_ACKNOWLEDGE')).toBe('soon');
  });
  it('còn 4–7 ngày → near', () => {
    expect(dueTone(at('2026-10-27T17:00:00'), NOW, 'IN_PROGRESS')).toBe('near');
    expect(dueTone(at('2026-10-30T17:00:00'), NOW, 'PENDING_REVIEW')).toBe('near');
  });
  it('còn >7 ngày → calm', () => {
    expect(dueTone(at('2026-10-31T17:00:00'), NOW, 'IN_PROGRESS')).toBe('calm');
  });
  it('việc đã xong → done (không cảnh báo, kể cả khi đã qua hạn)', () => {
    expect(dueTone(at('2026-10-01T17:00:00'), NOW, 'COMPLETED')).toBe('done');
  });
  it('việc đã hủy → none (không cảnh báo)', () => {
    expect(dueTone(at('2026-10-01T17:00:00'), NOW, 'CANCELLED')).toBe('none');
  });
  it('nhận chuỗi ISO', () => {
    expect(dueTone('2026-10-22T10:00:00.000Z', NOW, 'IN_PROGRESS')).toBe('overdue');
  });
  it('chuỗi không hợp lệ → none', () => {
    expect(dueTone('abc', NOW, 'IN_PROGRESS')).toBe('none');
  });
});

describe('dueInfo — nhãn tiếng Việt', () => {
  const label = (d: Date | null, s = 'IN_PROGRESS') => dueInfo(d, NOW, s as never).label;
  it('Trễ n ngày', () => expect(label(at('2026-10-20T17:00:00'))).toBe('Trễ 3 ngày'));
  it('Hạn hôm nay', () => expect(label(at('2026-10-23T17:00:00'))).toBe('Hạn hôm nay'));
  it('Hạn ngày mai', () => expect(label(at('2026-10-24T08:00:00'))).toBe('Hạn ngày mai'));
  it('Còn n ngày (2–7)', () => {
    expect(label(at('2026-10-25T08:00:00'))).toBe('Còn 2 ngày');
    expect(label(at('2026-10-30T08:00:00'))).toBe('Còn 7 ngày');
  });
  it('xa hơn 7 ngày → Hạn dd/MM', () => expect(label(at('2026-11-05T08:00:00'))).toBe('Hạn 05/11'));
  it('đã xong / đã hủy → Hạn dd/MM theo ngày VN', () => {
    expect(label(at('2026-10-01T00:30:00'), 'COMPLETED')).toBe('Hạn 01/10');
    expect(label(at('2026-10-01T00:30:00'), 'CANCELLED')).toBe('Hạn 01/10');
  });
  it('không có hạn → Chưa có hạn', () => expect(label(null)).toBe('Chưa có hạn'));
  it('trả kèm số ngày chênh', () => {
    expect(dueInfo(at('2026-10-20T17:00:00'), NOW, 'IN_PROGRESS').days).toBe(-3);
    expect(dueInfo(null, NOW, 'IN_PROGRESS').days).toBeNull();
  });
});
