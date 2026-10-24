/**
 * BẢN SAO logic V1 của /hr/users (trước A3-4) để đối chiếu — KHÔNG sửa theo code mới.
 * Nguồn: src/app/(dashboard)/hr/users/page.tsx, hr/users/components/{UserTable,UserActionsMenu,CreateUserModal,
 * EditUserModal,ChangePasswordModal}.tsx, hr/users/hooks/{useUsers,useCreateUser}.ts (commit 040e5b2).
 */
import { z } from 'zod';

/** page.tsx: hrFeatures của người đang đăng nhập */
export function v1HrFeatures(roleName: string, hasFeature: (m: string, f: string) => boolean): string[] {
  const isPrivileged = ['ADMIN', 'BOSS'].includes(roleName);
  return isPrivileged
    ? ['edit', 'deactivate', 'delete', 'change_password']
    : [
        ...(hasFeature('hr', 'edit') ? ['edit', 'change_password'] : []),
        ...(hasFeature('hr', 'deactivate') ? ['deactivate'] : []),
        ...(hasFeature('hr', 'delete') ? ['delete'] : []),
      ];
}

/** UserTable.tsx: effectiveFeatures cho từng dòng */
export function v1RowFeatures(isSelf: boolean, actorIsPrivileged: boolean, targetRole: string, hrFeatures: string[]): string[] {
  const targetIsPrivileged = ['ADMIN', 'BOSS'].includes(targetRole);
  let effectiveFeatures: string[];
  if (isSelf) effectiveFeatures = hrFeatures.filter((f) => ['edit'].includes(f));
  else if (!actorIsPrivileged && targetIsPrivileged) effectiveFeatures = [];
  else if (!actorIsPrivileged) effectiveFeatures = [];
  else effectiveFeatures = hrFeatures;
  const canManage = effectiveFeatures.length > 0;
  return canManage ? effectiveFeatures : [];
}

/** UserActionsMenu.tsx: các mục menu theo thứ tự (bỏ vạch ngăn) */
export function v1MenuItems(user: { isActive: boolean; email: string | null; hasTasks: boolean; roleName: string }, hrFeatures: string[]): string[] {
  const canEdit = hrFeatures.includes('edit');
  const canDeactivate = hrFeatures.includes('deactivate');
  const canDelete = hrFeatures.includes('delete');
  const canChangePass = hrFeatures.includes('change_password');
  const out = ['history'];
  if (canEdit) out.push('edit');
  if (canChangePass) out.push('password');
  if (canChangePass && user.email) out.push('resetLink');
  if (canDeactivate && user.isActive) out.push('deactivate');
  if (canDeactivate && !user.isActive) out.push('activate');
  if (canDelete && user.roleName !== 'ADMIN' && !user.hasTasks) out.push('delete');
  return out;
}

/** UserTable.tsx: id chọn được (hàng loạt) */
export function v1SelectableIds(users: { id: string }[], selfId: string | undefined, actorIsPrivileged: boolean): string[] {
  return actorIsPrivileged ? users.filter((u) => u.id !== selfId).map((u) => u.id) : [];
}

/** page.tsx + useUsers.ts: query string gọi GET /api/hr/users */
export function v1UsersQuery(s: { search: string; roleId: string; isActive: string; createdFrom: string; createdTo: string; page: number }): string {
  const filters = {
    search: s.search || undefined,
    roleId: s.roleId || undefined,
    isActive: s.isActive === 'all' ? undefined : s.isActive === 'active',
    createdFrom: s.createdFrom || undefined,
    createdTo: s.createdTo || undefined,
    page: s.page,
  } as { search?: string; roleId?: string; isActive?: boolean; page?: number; limit?: number; createdFrom?: string; createdTo?: string };
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.roleId) params.set('roleId', filters.roleId);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) params.set('createdTo', filters.createdTo);
  return `/api/hr/users?${params.toString()}`;
}

/** page.tsx: nút Xuất CSV */
export function v1ExportUrl(s: { search: string; roleId: string; isActive: string; createdFrom: string; createdTo: string }): string {
  const params = new URLSearchParams();
  if (s.search) params.set('search', s.search);
  if (s.roleId) params.set('roleId', s.roleId);
  if (s.isActive !== 'all') params.set('isActive', String(s.isActive === 'active'));
  if (s.createdFrom) params.set('createdFrom', s.createdFrom);
  if (s.createdTo) params.set('createdTo', s.createdTo);
  return `/api/hr/users/export?${params.toString()}`;
}

/** CreateUserModal.tsx */
export const v1SchemaManual = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chữ cái, số, dấu _'),
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  password: z.string().min(8, 'Tối thiểu 8 ký tự'),
  confirmPassword: z.string(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
}).refine((d) => d.password === d.confirmPassword, { message: 'Mật khẩu không khớp', path: ['confirmPassword'] });

export const v1SchemaSetupLink = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chữ cái, số, dấu _'),
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email bắt buộc để gửi link thiết lập mật khẩu'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
});

export function v1CreatePayload(values: { username: string; displayName: string; email?: string; password?: string; roleId: string }, isSetupLink: boolean) {
  return {
    username: values.username,
    displayName: values.displayName,
    email: values.email || undefined,
    password: isSetupLink ? undefined : values.password,
    roleId: values.roleId,
    sendSetupLink: isSetupLink,
  };
}

/** EditUserModal.tsx */
export const v1EditSchema = z.object({
  displayName: z.string().min(1, 'Bắt buộc').max(100),
  email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
  password: z.string().min(6, 'Tối thiểu 6 ký tự').or(z.literal('')).optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => { if (!d.password) return true; return d.password === d.confirmPassword; },
  { message: 'Mật khẩu không khớp', path: ['confirmPassword'] });

export function v1EditPayload(values: { displayName: string; email?: string; roleId: string; password?: string }) {
  const payload: Record<string, unknown> = { displayName: values.displayName, email: values.email || undefined, roleId: values.roleId };
  if (values.password) payload.password = values.password;
  return payload;
}

/** ChangePasswordModal.tsx */
export interface V1Policy { minLength: number; requireUppercase: boolean; requireLowercase: boolean; requireNumber: boolean; requireSpecialChar: boolean }
export function v1PolicyChecks(policy: V1Policy, password: string) {
  const checks = [{ label: `Ít nhất ${policy.minLength} ký tự`, met: password.length >= policy.minLength }];
  if (policy.requireUppercase) checks.push({ label: 'Có ít nhất 1 chữ hoa (A-Z)', met: /[A-Z]/.test(password) });
  if (policy.requireLowercase) checks.push({ label: 'Có ít nhất 1 chữ thường (a-z)', met: /[a-z]/.test(password) });
  if (policy.requireNumber) checks.push({ label: 'Có ít nhất 1 chữ số (0-9)', met: /[0-9]/.test(password) });
  if (policy.requireSpecialChar) checks.push({ label: 'Có ít nhất 1 ký tự đặc biệt (!@#...)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) });
  return checks;
}
export const v1PwSchema = z.object({ password: z.string().min(1, 'Bắt buộc'), confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: 'Mật khẩu không khớp', path: ['confirmPassword'] });
/** true = V1 cho gửi PATCH { password } */
export function v1CanSubmitPw(policy: V1Policy, password: string, confirmPassword: string): boolean {
  if (!v1PwSchema.safeParse({ password, confirmPassword }).success) return false;
  const checks = v1PolicyChecks(policy, password);
  return password.length > 0 && checks.every((c) => c.met);
}
