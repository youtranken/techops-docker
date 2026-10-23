import { describe, it, expect } from 'vitest';
import { resolveLocale, localeCookie, LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, intlLocale } from '../locale';

describe('resolveLocale — chọn ngôn ngữ từ cookie NEXT_LOCALE', () => {
  it('hỗ trợ đúng 2 ngôn ngữ, mặc định vi, cookie tên NEXT_LOCALE', () => {
    expect(LOCALES).toEqual(['vi', 'en']);
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(LOCALE_COOKIE).toBe('NEXT_LOCALE');
  });
  it('vi / en hợp lệ → giữ nguyên', () => {
    expect(resolveLocale('vi')).toBe('vi');
    expect(resolveLocale('en')).toBe('en');
  });
  it('không có cookie → vi', () => {
    expect(resolveLocale(undefined)).toBe('vi');
    expect(resolveLocale(null)).toBe('vi');
    expect(resolveLocale('')).toBe('vi');
  });
  it('giá trị lạ → vi (không tin dữ liệu từ cookie)', () => {
    expect(resolveLocale('fr')).toBe('vi');
    expect(resolveLocale('EN')).toBe('vi');
    expect(resolveLocale('en-US')).toBe('vi');
    expect(resolveLocale('../../etc/passwd')).toBe('vi');
    expect(resolveLocale(42)).toBe('vi');
  });
});

describe('localeCookie — chuỗi document.cookie khi đổi ngôn ngữ', () => {
  it('đặt cookie toàn site, sống 1 năm, SameSite=Lax', () => {
    expect(localeCookie('en')).toBe('NEXT_LOCALE=en; Path=/; Max-Age=31536000; SameSite=Lax');
    expect(localeCookie('vi')).toBe('NEXT_LOCALE=vi; Path=/; Max-Age=31536000; SameSite=Lax');
  });
});

describe('intlLocale — mã locale cho Intl', () => {
  it('vi → vi-VN, en → en-US', () => {
    expect(intlLocale('vi')).toBe('vi-VN');
    expect(intlLocale('en')).toBe('en-US');
  });
});
