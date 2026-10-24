/**
 * Đăng nhập / Mật khẩu (A3-8) — hàm thuần, test ở __tests__/auth-logic.test.ts.
 * Giữ nghiệp vụ V1: payload gửi API, câu lỗi đăng nhập CHUNG, luồng token reset/verify.
 * Chính sách mật khẩu dùng chung policyChecks của Hồ sơ (A3-2), khớp lib/password-policy.ts (server vẫn quyết định).
 */
import type { PasswordPolicyConfig } from '@/modules/settings/types';
import { policyChecks } from '@/modules/settings/lib/password-rules';

/**
 * callbackUrl sau đăng nhập: CHỈ đường dẫn nội bộ (bắt đầu bằng 1 dấu "/").
 * V1 đẩy thẳng `router.push(callbackUrl)` → `?callbackUrl=https://…` hoặc `//host` dẫn ra ngoài (open-redirect).
 * Middleware V1 chỉ gửi pathname nội bộ nên luồng bình thường không đổi.
 */
export function safeCallbackUrl(raw: string | string[] | null | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') return '/';
  if (!v.startsWith('/')) return '/';
  if (v.startsWith('//') || v.startsWith('/\\')) return '/';
  // ký tự điều khiển / khoảng trắng đầu (trình duyệt bỏ tab/xuống dòng → "//host")
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v)) return '/';
  return v;
}

export interface LoginForm { username: string; password: string }
export type LoginErrors = Partial<Record<keyof LoginForm, string>>;

/** Đối số thứ 2 của signIn('credentials', …) — y hệt V1 (giá trị ô gốc, không trim). */
export function loginPayload(f: LoginForm) {
  return { username: f.username, password: f.password, redirect: false as const };
}

export function validateLogin(f: LoginForm): LoginErrors {
  const e: LoginErrors = {};
  if (!f.username.trim()) e.username = 'au.user.req';
  if (!f.password) e.password = 'au.pass.req';
  return e;
}

type SignInResult = { error?: string | null; ok?: boolean; status?: number; url?: string | null } | undefined;

/**
 * Kết quả signIn → việc tiếp theo. V1 (LoginForm.tsx): `result?.error` → "Sai tên đăng nhập hoặc mật khẩu";
 * ném lỗi → "Đã xảy ra lỗi. Vui lòng thử lại.". Server (lib/auth.ts) trả null cho mọi trường hợp
 * (sai mật khẩu, không có user, bị vô hiệu hoá, IP đang bị khoá) → không phân biệt được, và KHÔNG nên phân biệt.
 */
export function loginOutcome(r: SignInResult | 'throw'): { kind: 'ok' } | { kind: 'error'; key: string } {
  if (r === 'throw') return { kind: 'error', key: 'aux.err.generic' };
  if (r?.error) return { kind: 'error', key: 'au.err.wrong' };
  return { kind: 'ok' };
}

export interface NewPasswordForm { next: string; confirm: string }
export type NewPasswordErrors = Partial<Record<keyof NewPasswordForm, string>>;

export function resetPayload(token: string, f: NewPasswordForm) {
  return { token, newPassword: f.next };
}

export function validateResetForm(f: NewPasswordForm, p: PasswordPolicyConfig): NewPasswordErrors {
  const e: NewPasswordErrors = {};
  if (!f.next) e.next = 'au.new.req';
  else if (!policyChecks(p, f.next).every((c) => c.ok)) e.next = 'au.err.policy';
  if (!f.confirm) e.confirm = 'au.new2.req';
  else if (f.next && f.confirm !== f.next) e.confirm = 'au.err.match';
  return e;
}

export type ResetLinkState = 'checking' | 'bad' | 'expired' | 'net' | 'form';

/** V1: thiếu token → báo lỗi ngay; GET /check {valid:false} → hết hạn/không hợp lệ (ẩn form); fetch lỗi → "Không thể kiểm tra link". */
export function resetLinkState(token: string, check: { valid?: boolean } | 'net' | undefined): ResetLinkState {
  if (!token) return 'bad';
  if (check === undefined) return 'checking';
  if (check === 'net') return 'net';
  return check.valid ? 'form' : 'expired';
}

/** Lỗi POST /api/auth/reset-password → chỗ hiện. */
export function resetServerError(code: string | undefined): { field: 'next' } | { link: 'expired' } | { note: true } {
  if (code === 'WEAK_PASSWORD') return { field: 'next' };
  if (code === 'TOKEN_INVALID') return { link: 'expired' };
  return { note: true };
}

export type VerifyState = 'busy' | 'ok' | 'missing' | 'expired' | 'changed' | 'unknown';

/** /verify-email?success=1 | ?error=missing_token|invalid_or_expired|email_changed (API V1 redirect về). */
export function verifyState(q: URLSearchParams): VerifyState {
  if (q.get('success') === '1') return 'ok';
  const err = q.get('error') ?? '';
  if (!err) return 'busy';
  if (err === 'missing_token') return 'missing';
  if (err === 'invalid_or_expired') return 'expired';
  if (err === 'email_changed') return 'changed';
  return 'unknown';
}

type PwFields = { current?: string; next: string; confirm: string };

/** Gõ lại ô `k` → gỡ lỗi ô đó; lỗi chính sách chỉ gỡ khi đạt đủ, "không khớp" chỉ gỡ khi đã khớp (preview password.html). */
export function clearOnType<E extends Partial<Record<keyof PwFields, string>>>(e: E, k: keyof PwFields, f: PwFields, p: PasswordPolicyConfig): E {
  const out: Partial<Record<keyof PwFields, string>> = { ...e };
  if (k === 'next' && e.next === 'au.err.policy') {
    if (policyChecks(p, f.next).every((c) => c.ok)) delete out.next;
  } else if (k === 'confirm' && e.confirm === 'au.err.match') {
    // gỡ ở dưới khi khớp
  } else {
    delete out[k];
  }
  if (out.confirm === 'au.err.match' && f.confirm === f.next) delete out.confirm;
  return out as E;
}
