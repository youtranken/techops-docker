/**
 * Biểu mẫu Hồ sơ (A3-2) — hàm thuần, test ở __tests__/profile-form.test.ts.
 * Luật = V1: zod của PATCH /api/settings/profile (validators/profile.schema.ts) + ProfileBasicInfo/ProfileContact/ProfileAvatar.
 * Body gửi đi giữ đúng 2 kiểu của V1: cơ bản {displayName, position, department, timezone, bio} và liên hệ {email, phone}.
 */
import { profileUpdateSchema } from '../validators/profile.schema';
import type { UserProfileData } from '../types';

export const TIMEZONES = ['Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Singapore', 'Asia/Tokyo', 'UTC'] as const;
/** khoá i18n cho từng múi giờ (preview `pf.tz.*`) */
export const TIMEZONE_KEY: Record<string, string> = {
  'Asia/Bangkok': 'pf.tz.bkk', 'Asia/Ho_Chi_Minh': 'pf.tz.hcm', 'Asia/Singapore': 'pf.tz.sg', 'Asia/Tokyo': 'pf.tz.tyo', UTC: 'pf.tz.utc',
};
export const AVATAR_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'] as const;
export const DEFAULT_AVATAR_COLOR = '#3B82F6';

export interface ProfileForm {
  displayName: string; position: string; department: string; bio: string; timezone: string;
  email: string; phone: string;
}
export type ProfileField = keyof ProfileForm;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

const BASIC: ProfileField[] = ['displayName', 'position', 'department', 'timezone', 'bio'];
const CONTACT: ProfileField[] = ['email', 'phone'];

export function profileFormFrom(p: UserProfileData): ProfileForm {
  return {
    displayName: p.displayName,
    position: p.profile?.position ?? '',
    department: p.profile?.department ?? '',
    bio: p.profile?.bio ?? '',
    timezone: p.profile?.timezone ?? 'Asia/Bangkok',
    email: p.email ?? '',
    phone: p.profile?.phone ?? '',
  };
}

/** Lỗi theo ô (khoá i18n) — chạy đúng schema của server. */
export function validateProfileForm(f: ProfileForm): ProfileErrors {
  const r = profileUpdateSchema.safeParse(f);
  if (r.success) return {};
  const out: ProfileErrors = {};
  for (const issue of r.error.issues) {
    const field = issue.path[0] as ProfileField;
    if (out[field]) continue;
    if (field === 'email') out.email = 'pf.email.bad';
    else if (issue.code === 'too_big') out[field] = 'pfx.tooLong';
    else if (field === 'displayName') out.displayName = 'pf.name.req';
    else out[field] = 'pfx.invalid';
  }
  return out;
}

const changed = (a: ProfileForm, b: ProfileForm, keys: ProfileField[]) => keys.some((k) => a[k] !== b[k]);

export function isProfileDirty(init: ProfileForm, cur: ProfileForm): boolean {
  return changed(init, cur, [...BASIC, ...CONTACT]);
}

export function profilePayloads(init: ProfileForm, cur: ProfileForm): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  if (changed(init, cur, BASIC)) {
    out.push({ displayName: cur.displayName, position: cur.position, department: cur.department, timezone: cur.timezone, bio: cur.bio });
  }
  if (changed(init, cur, CONTACT)) out.push({ email: cur.email, phone: cur.phone });
  return out;
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const AVATAR_EXTS = ['jpg', 'jpeg', 'png'];
export const AVATAR_MAX = 2 * 1024 * 1024;

/** V1 ProfileAvatar: sai khi type KHÔNG hợp lệ VÀ đuôi KHÔNG hợp lệ; rồi mới kiểm 2 MB. */
export function checkAvatarFile(f: { name: string; type: string; size: number }): { key: 'pf.av.errType' | 'pf.av.errSize' } | null {
  const ext = (f.name.includes('.') ? f.name.split('.').pop() ?? '' : '').toLowerCase();
  if (!AVATAR_TYPES.includes(f.type) && !AVATAR_EXTS.includes(ext)) return { key: 'pf.av.errType' };
  if (f.size > AVATAR_MAX) return { key: 'pf.av.errSize' };
  return null;
}
