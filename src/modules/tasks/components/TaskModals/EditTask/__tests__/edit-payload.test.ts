import { describe, it, expect } from 'vitest';
import { omitUnchangedImportant } from '../edit-payload';

describe('omitUnchangedImportant — form Sửa không ghi đè ★ dùng chung', () => {
  it('không đổi ★ trong form → bỏ isImportant khỏi payload (giữ nguyên ★ hiện tại trên server)', () => {
    const out = omitUnchangedImportant({ title: 'A', isImportant: false }, false);
    expect(out).toEqual({ title: 'A' });
    expect(out).not.toHaveProperty('isImportant');
  });

  it('có bật/tắt ★ trong form → gửi isImportant', () => {
    expect(omitUnchangedImportant({ title: 'A', isImportant: true }, false)).toEqual({ title: 'A', isImportant: true });
    expect(omitUnchangedImportant({ isImportant: false }, true)).toEqual({ isImportant: false });
  });

  it('không có isImportant → giữ nguyên payload', () => {
    expect(omitUnchangedImportant<{ title: string; isImportant?: boolean }>({ title: 'A' }, true)).toEqual({ title: 'A' });
  });
});
