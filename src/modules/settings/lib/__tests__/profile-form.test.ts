import { describe, it, expect } from 'vitest';
import {
  profileFormFrom, validateProfileForm, profilePayloads, isProfileDirty, checkAvatarFile, AVATAR_COLORS, TIMEZONES,
} from '../profile-form';
import { profileUpdateSchema } from '../../validators/profile.schema';
import type { UserProfileData } from '../../types';

const base: UserProfileData = {
  id: 'ce2ee2ebossxxxxxxxxxxxxxx', username: 'e2e_boss', displayName: '[E2E] Boss', email: 'boss@pmh.com.vn',
  role: { name: 'BOSS' }, createdAt: '2026-10-23T00:00:00.000Z',
  profile: { avatarColor: '#3B82F6', avatarUrl: null, phone: '0912 345 678', department: 'Phòng IT', position: null, bio: null, timezone: 'Asia/Bangkok' },
};

describe('profileFormFrom — giá trị ban đầu như V1 (ProfileBasicInfo/ProfileContact)', () => {
  it('null → chuỗi rỗng; múi giờ mặc định Asia/Bangkok', () => {
    expect(profileFormFrom(base)).toEqual({
      displayName: '[E2E] Boss', position: '', department: 'Phòng IT', bio: '', timezone: 'Asia/Bangkok',
      email: 'boss@pmh.com.vn', phone: '0912 345 678',
    });
    expect(profileFormFrom({ ...base, email: null, profile: null })).toMatchObject({ email: '', phone: '', timezone: 'Asia/Bangkok' });
  });

  it('5 múi giờ + 10 màu của V1', () => {
    expect(TIMEZONES).toEqual(['Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Singapore', 'Asia/Tokyo', 'UTC']);
    expect(AVATAR_COLORS).toEqual(['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16']);
  });
});

describe('validateProfileForm — đúng luật zod của PATCH /api/settings/profile (V1)', () => {
  const f = profileFormFrom(base);
  it('hợp lệ → không lỗi', () => {
    expect(validateProfileForm(f)).toEqual({});
    expect(validateProfileForm({ ...f, email: '' })).toEqual({}); // xoá email được
  });
  it('tên rỗng → pf.name.req; email sai → pf.email.bad', () => {
    expect(validateProfileForm({ ...f, displayName: '', email: 'abc' })).toEqual({ displayName: 'pf.name.req', email: 'pf.email.bad' });
  });
  it('quá độ dài V1 (tên/chức vụ/phòng ban 100, ĐT 20, giới thiệu 500) → lỗi tooLong', () => {
    const e = validateProfileForm({ ...f, displayName: 'x'.repeat(101), position: 'x'.repeat(101), department: 'x'.repeat(101), phone: '1'.repeat(21), bio: 'x'.repeat(501) });
    expect(e).toEqual({
      displayName: 'pfx.tooLong', position: 'pfx.tooLong', department: 'pfx.tooLong', phone: 'pfx.tooLong', bio: 'pfx.tooLong',
    });
  });
  it('V1 không kiểm định dạng số điện thoại, không bắt bỏ khoảng trắng tên', () => {
    expect(validateProfileForm({ ...f, phone: 'abc-xyz' })).toEqual({});
    expect(validateProfileForm({ ...f, displayName: '  ' })).toEqual({});
  });
  it('kết quả trùng với server: mọi biểu mẫu không lỗi đều qua schema của route', () => {
    for (const x of [f, { ...f, email: '' }, { ...f, bio: 'x'.repeat(500) }]) {
      expect(validateProfileForm(x)).toEqual({});
      for (const p of profilePayloads(profileFormFrom(base), x)) expect(profileUpdateSchema.safeParse(p).success).toBe(true);
    }
  });
});

describe('profilePayloads — body PATCH giống hệt V1', () => {
  const init = profileFormFrom(base);
  it('không đổi → không gọi API', () => {
    expect(profilePayloads(init, init)).toEqual([]);
    expect(isProfileDirty(init, init)).toBe(false);
  });
  it('đổi thông tin cơ bản (kể cả múi giờ) → đúng body của ProfileBasicInfo V1', () => {
    expect(profilePayloads(init, { ...init, position: 'Kỹ sư', timezone: 'UTC' })).toEqual([
      { displayName: '[E2E] Boss', position: 'Kỹ sư', department: 'Phòng IT', timezone: 'UTC', bio: '' },
    ]);
  });
  it('đổi liên hệ → đúng body của ProfileContact V1', () => {
    expect(profilePayloads(init, { ...init, phone: '0909' })).toEqual([{ email: 'boss@pmh.com.vn', phone: '0909' }]);
  });
  it('đổi cả hai → 2 lần gọi như V1 (cơ bản trước, liên hệ sau)', () => {
    const p = profilePayloads(init, { ...init, displayName: 'B', email: '' });
    expect(p).toEqual([
      { displayName: 'B', position: '', department: 'Phòng IT', timezone: 'Asia/Bangkok', bio: '' },
      { email: '', phone: '0912 345 678' },
    ]);
    expect(isProfileDirty(init, { ...init, displayName: 'B' })).toBe(true);
  });
});

describe('checkAvatarFile — luật ảnh V1 (ProfileAvatar): JPEG/PNG theo type HOẶC đuôi, ≤ 2 MB', () => {
  const MB = 1024 * 1024;
  it('hợp lệ', () => {
    expect(checkAvatarFile({ name: 'a.png', type: 'image/png', size: MB })).toBeNull();
    expect(checkAvatarFile({ name: 'a.JPG', type: '', size: 2 * MB })).toBeNull(); // đuôi đúng, type trống
    expect(checkAvatarFile({ name: 'noext', type: 'image/jpeg', size: 10 })).toBeNull();
  });
  it('sai định dạng', () => {
    expect(checkAvatarFile({ name: 'so-do.pdf', type: 'application/pdf', size: 10 })).toEqual({ key: 'pf.av.errType' });
    expect(checkAvatarFile({ name: 'a.gif', type: 'image/gif', size: 10 })).toEqual({ key: 'pf.av.errType' });
  });
  it('quá 2 MB (kiểm sau định dạng như V1)', () => {
    expect(checkAvatarFile({ name: 'big.png', type: 'image/png', size: 2 * MB + 1 })).toEqual({ key: 'pf.av.errSize' });
  });
});
