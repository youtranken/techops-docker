import { describe, it, expect } from 'vitest';
import { maskAttemptedUsername } from '../login-log';

describe('maskAttemptedUsername — không lưu nguyên chuỗi người dùng gõ khi username không tồn tại', () => {
  it('chỉ giữ 2 ký tự đầu + độ dài', () => {
    expect(maskAttemptedUsername('MatKhau@2026')).toBe('Ma•••(12 ký tự)');
  });

  it('chuỗi rất ngắn vẫn che', () => {
    expect(maskAttemptedUsername('a')).toBe('a•••(1 ký tự)');
  });

  it('chuỗi cực dài: không lưu nội dung dài, độ dài bị chặn ở 999+', () => {
    const out = maskAttemptedUsername('x'.repeat(5_000_000));
    expect(out).toBe('xx•••(999+ ký tự)');
    expect(out.length).toBeLessThan(30);
  });

  it('không phải chuỗi / rỗng → "?"', () => {
    expect(maskAttemptedUsername(undefined)).toBe('?');
    expect(maskAttemptedUsername('   ')).toBe('?');
    expect(maskAttemptedUsername(123 as unknown)).toBe('?');
  });
});
