/**
 * Luật nhập + payload các hộp thoại Nhân sự V2 — GIỮ NGUYÊN luật V1 (CreateUserModal / EditUserModal /
 * ChangePasswordModal), chỉ đổi lời báo lỗi sang khoá i18n. Đối chiếu V1 ở __tests__/people-forms.test.ts.
 */
import { z } from 'zod';

/** Lỗi theo ô → khoá i18n */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

function collect<K extends string>(r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  if (r.success || !r.error) return out;
  for (const i of r.error.issues) {
    const k = String(i.path[0]) as K;
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const USERNAME = z.string().min(3, 'pp.e.user').max(50, 'pp.e.user').regex(/^[a-zA-Z0-9_]+$/, 'pp.e.user');
const NAME = z.string().min(1, 'pp.e.req').max(100, 'ppx.e.nameMax');

// ───────────────────────────── Tạo người dùng ─────────────────────────────
export type CreateMode = 'password' | 'link';
export interface CreateValues {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  roleId: string;
}
export type CreateField = keyof CreateValues;
export const EMPTY_CREATE: CreateValues = { username: '', displayName: '', email: '', password: '', confirmPassword: '', roleId: '' };

const createManual = z.object({
  username: USERNAME,
  displayName: NAME,
  email: z.string().email('pp.e.email').or(z.literal('')).optional(),
  password: z.string().min(8, 'ppx.e.pwMin8'),
  confirmPassword: z.string(),
  roleId: z.string().min(1, 'pp.e.role'),
}).refine((d) => d.password === d.confirmPassword, { message: 'pp.e.pwMatch', path: ['confirmPassword'] });

const createLink = z.object({
  username: USERNAME,
  displayName: NAME,
  email: z.string().email('pp.e.emailLink'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  roleId: z.string().min(1, 'pp.e.role'),
});

export function validateCreate(v: CreateValues, mode: CreateMode): FieldErrors<CreateField> {
  return collect<CreateField>((mode === 'link' ? createLink : createManual).safeParse(v));
}

/** Body POST /api/hr/users (V1) */
export function createPayload(v: CreateValues, mode: CreateMode) {
  const link = mode === 'link';
  return {
    username: v.username,
    displayName: v.displayName,
    email: v.email || undefined,
    password: link ? undefined : v.password,
    roleId: v.roleId,
    sendSetupLink: link,
  };
}

// ───────────────────────────── Sửa thông tin ─────────────────────────────
export interface EditValues {
  displayName: string;
  email: string;
  roleId: string;
  password: string;
  confirmPassword: string;
}
export type EditField = keyof EditValues;

const editSchema = z.object({
  displayName: NAME,
  email: z.string().email('pp.e.email').or(z.literal('')).optional(),
  roleId: z.string().min(1, 'pp.e.role'),
  password: z.string().min(6, 'ppx.e.pwMin6').or(z.literal('')).optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => (!d.password ? true : d.password === d.confirmPassword), { message: 'pp.e.pwMatch', path: ['confirmPassword'] });

export function validateEdit(v: EditValues): FieldErrors<EditField> {
  return collect<EditField>(editSchema.safeParse(v));
}

/** Body PATCH /api/hr/users/:id (V1: luôn gửi roleId; email rỗng → bỏ; mật khẩu chỉ khi có nhập) */
export function editPayload(v: EditValues): Record<string, unknown> {
  const p: Record<string, unknown> = { displayName: v.displayName, email: v.email || undefined, roleId: v.roleId };
  if (v.password) p.password = v.password;
  return p;
}

// ───────────────────────────── Đặt mật khẩu cho người khác ─────────────────────────────
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}
export const DEFAULT_POLICY: PasswordPolicy = { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialChar: false };

export interface PolicyCheck { key: 'len' | 'up' | 'lo' | 'num' | 'sp'; met: boolean }
/** V1 ChangePasswordModal.getPolicyChecks (cùng biểu thức) */
export function policyChecks(p: PasswordPolicy, pw: string): PolicyCheck[] {
  const c: PolicyCheck[] = [{ key: 'len', met: pw.length >= p.minLength }];
  if (p.requireUppercase) c.push({ key: 'up', met: /[A-Z]/.test(pw) });
  if (p.requireLowercase) c.push({ key: 'lo', met: /[a-z]/.test(pw) });
  if (p.requireNumber) c.push({ key: 'num', met: /[0-9]/.test(pw) });
  if (p.requireSpecialChar) c.push({ key: 'sp', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) });
  return c;
}

/** V1: bắt buộc nhập, nhập lại khớp, đạt hết chính sách (V1 báo bằng toast, V2 báo dưới ô). */
export function validateResetPassword(pw: string, confirm: string, p: PasswordPolicy): FieldErrors<'password' | 'confirmPassword'> {
  const e: FieldErrors<'password' | 'confirmPassword'> = {};
  if (!pw) e.password = 'pp.e.req';
  else if (!policyChecks(p, pw).every((c) => c.met)) e.password = 'pp.e.pwPolicy';
  if (pw && pw !== confirm) e.confirmPassword = 'pp.e.pwMatch';
  return e;
}
