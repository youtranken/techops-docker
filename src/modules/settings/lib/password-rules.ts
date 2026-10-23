/**
 * Đổi mật khẩu trong Hồ sơ (A3-2) — hàm thuần, test ở __tests__/password-rules.test.ts.
 * Chính sách lấy từ GET /api/auth/password-policy (V1); regex khớp lib/password-policy.ts (server vẫn là nơi quyết định).
 */
import type { PasswordPolicyConfig } from '../types';

/** Mặc định của lib/password-policy.ts khi chưa tải được cấu hình */
export const DEFAULT_POLICY: PasswordPolicyConfig = {
  minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialChar: false, expiryDays: 0, historyCount: 0,
};

const SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\|,.<>\/?]/;

export interface PolicyCheck { key: string; values?: Record<string, number>; ok: boolean }

export function policyChecks(p: PasswordPolicyConfig, pw: string): PolicyCheck[] {
  const out: PolicyCheck[] = [{ key: 'au.pol.len', values: { n: p.minLength }, ok: pw.length >= p.minLength }];
  if (p.requireUppercase) out.push({ key: 'au.pol.up', ok: /[A-Z]/.test(pw) });
  if (p.requireLowercase) out.push({ key: 'au.pol.low', ok: /[a-z]/.test(pw) });
  if (p.requireNumber) out.push({ key: 'au.pol.num', ok: /[0-9]/.test(pw) });
  if (p.requireSpecialChar) out.push({ key: 'au.pol.sp', ok: SPECIAL.test(pw) });
  return out;
}

export interface PasswordForm { current: string; next: string; confirm: string }
export type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

export function validatePasswordForm(f: PasswordForm, p: PasswordPolicyConfig): PasswordErrors {
  const e: PasswordErrors = {};
  if (!f.current) e.current = 'au.cur.req';
  if (!f.next) e.next = 'au.new.req';
  else if (!policyChecks(p, f.next).every((c) => c.ok)) e.next = 'au.err.policy';
  if (!f.confirm) e.confirm = 'au.new2.req';
  else if (f.confirm !== f.next) e.confirm = 'au.err.match';
  return e;
}

export function changePasswordPayload(f: PasswordForm) {
  return { currentPassword: f.current, newPassword: f.next };
}

/** Mã lỗi server → ô hiện lỗi. key null = dùng câu server trả (đã qua errMsg). */
export function passwordServerError(code: string | undefined): { field: keyof PasswordForm; key: string | null } | null {
  if (code === 'WRONG_PASSWORD') return { field: 'current', key: 'au.err.cur' };
  if (code === 'SAME_PASSWORD') return { field: 'next', key: 'au.err.same' };
  if (code === 'PASSWORD_POLICY_VIOLATION') return { field: 'next', key: null };
  return null;
}
