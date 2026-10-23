import { describe, it, expect } from 'vitest';
import { formatDate, formatDayMonth, formatNumber, formatPercent, APP_TIMEZONE } from '../format';

// 23/10/2026 00:30 giờ VN = 22/10/2026 17:30 UTC → ngày phải tính theo múi giờ app
const D = new Date('2026-10-22T17:30:00Z');

describe('formatDate — ngày đầy đủ theo locale, ở múi giờ app', () => {
  it('múi giờ app là Asia/Bangkok (UTC+7)', () => expect(APP_TIMEZONE).toBe('Asia/Bangkok'));
  it('vi: dd/MM/yyyy', () => expect(formatDate(D, 'vi')).toBe('23/10/2026'));
  it('en: MMM d, yyyy', () => expect(formatDate(D, 'en')).toBe('Oct 23, 2026'));
  it('nhận chuỗi ISO; rỗng/không hợp lệ → chuỗi rỗng', () => {
    expect(formatDate('2026-11-05T01:00:00Z', 'vi')).toBe('05/11/2026');
    expect(formatDate(null, 'vi')).toBe('');
    expect(formatDate('abc', 'en')).toBe('');
  });
});

describe('formatDayMonth — ngày ngắn (nhãn hạn)', () => {
  it('vi: dd/MM', () => expect(formatDayMonth(new Date('2026-11-05T01:00:00Z'), 'vi')).toBe('05/11'));
  it('en: MMM d', () => expect(formatDayMonth(new Date('2026-11-05T01:00:00Z'), 'en')).toBe('Nov 5'));
});

describe('formatNumber — phân cách hàng nghìn', () => {
  it('vi: 1.248', () => expect(formatNumber(1248, 'vi')).toBe('1.248'));
  it('en: 1,248', () => expect(formatNumber(1248, 'en')).toBe('1,248'));
  it('số thập phân: vi 3,5 · en 3.5', () => {
    expect(formatNumber(3.5, 'vi')).toBe('3,5');
    expect(formatNumber(3.5, 'en')).toBe('3.5');
  });
});

describe('formatPercent — tỉ lệ (0..1) thành phần trăm, tối đa 1 chữ số lẻ', () => {
  it('vi: 92,4%', () => expect(formatPercent(0.924, 'vi')).toBe('92,4%'));
  it('en: 92.4%', () => expect(formatPercent(0.924, 'en')).toBe('92.4%'));
  it('số tròn không có phần lẻ', () => {
    expect(formatPercent(1, 'vi')).toBe('100%');
    expect(formatPercent(0.5, 'en')).toBe('50%');
  });
});
