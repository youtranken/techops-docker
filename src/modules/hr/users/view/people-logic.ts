/**
 * Logic thuần trang Nhân sự V2 (A3-4) — giữ nghiệp vụ V1 của /hr/users (đối chiếu ở __tests__/v1-people.fixture.ts).
 * - Quyền thao tác trên từng dòng: actorHrFeatures → rowFeatures → rowActionGroups (đúng menu ⋯ V1).
 * - Bộ lọc → query GET /api/hr/users và link Xuất CSV giống hệt V1.
 * Khác V1 (chỉ hiển thị, có ghi báo cáo): nhân viên không còn thấy "Lịch sử hoạt động" của NGƯỜI KHÁC
 * (V1 hiện mục này nhưng API /api/logs/users trả về lịch sử của chính người xem → nhãn sai người).
 */

export type HrFeature = 'edit' | 'deactivate' | 'delete' | 'change_password';
export type RowActionKey = 'history' | 'edit' | 'password' | 'resetLink' | 'deactivate' | 'activate' | 'delete';
export type StatusFilter = 'all' | 'active' | 'inactive';

export const isPrivilegedRole = (role?: string | null) => role === 'ADMIN' || role === 'BOSS';

/** V1 hr/users/page.tsx: ADMIN/BOSS đủ 4 quyền; nhân viên theo quyền menu `hr` (edit kéo theo change_password). */
export function actorHrFeatures(role: string | undefined | null, hasFeature: (menu: string, feat: string) => boolean): HrFeature[] {
  if (isPrivilegedRole(role)) return ['edit', 'deactivate', 'delete', 'change_password'];
  return [
    ...(hasFeature('hr', 'edit') ? (['edit', 'change_password'] as const) : []),
    ...(hasFeature('hr', 'deactivate') ? (['deactivate'] as const) : []),
    ...(hasFeature('hr', 'delete') ? (['delete'] as const) : []),
  ];
}

/** V1 UserTable: chính mình → chỉ 'edit'; nhân viên với người khác → không gì; ADMIN/BOSS → đủ. */
export function rowFeatures(o: { isSelf: boolean; actorPrivileged: boolean; hrFeatures: readonly string[] }): string[] {
  if (o.isSelf) return o.hrFeatures.filter((f) => f === 'edit');
  if (!o.actorPrivileged) return [];
  return [...o.hrFeatures];
}

export interface RowUser {
  id: string;
  isActive: boolean;
  email: string | null;
  hasTasks: boolean;
  roleName: string;
}
export interface RowCtx {
  selfId: string | undefined;
  actorPrivileged: boolean;
  hrFeatures: readonly string[];
}

/** Xem lịch sử: ADMIN/BOSS với mọi người, nhân viên chỉ với chính mình (xem ghi chú đầu file). */
export const canSeeHistory = (u: { id: string }, ctx: RowCtx) => ctx.actorPrivileged || u.id === ctx.selfId;

/** Menu ⋯ của 1 dòng, chia nhóm như V1: [Lịch sử] · [Sửa, Đổi MK, Gửi link] · [Vô hiệu/Kích hoạt, Xoá]. */
export function rowActionGroups(u: RowUser, ctx: RowCtx): RowActionKey[][] {
  const f = rowFeatures({ isSelf: u.id === ctx.selfId, actorPrivileged: ctx.actorPrivileged, hrFeatures: ctx.hrFeatures });
  const has = (k: string) => f.includes(k);
  const g1: RowActionKey[] = canSeeHistory(u, ctx) ? ['history'] : [];
  const g2: RowActionKey[] = [];
  if (has('edit')) g2.push('edit');
  if (has('change_password')) g2.push('password');
  if (has('change_password') && u.email) g2.push('resetLink');
  const g3: RowActionKey[] = [];
  if (has('deactivate')) g3.push(u.isActive ? 'deactivate' : 'activate');
  if (has('delete') && u.roleName !== 'ADMIN' && !u.hasTasks) g3.push('delete');
  return [g1, g2, g3].filter((g) => g.length > 0);
}

/** V1: chỉ ADMIN/BOSS chọn hàng loạt, không chọn chính mình. */
export function selectableIds(users: readonly { id: string }[], selfId: string | undefined, actorPrivileged: boolean): string[] {
  return actorPrivileged ? users.filter((u) => u.id !== selfId).map((u) => u.id) : [];
}

// ───────────────────────────── bộ lọc ─────────────────────────────
export interface PeopleFilters {
  search: string;
  roleId: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
  page: number;
}
export const EMPTY_FILTERS: PeopleFilters = { search: '', roleId: '', status: 'all', createdFrom: '', createdTo: '', page: 1 };

/** Tham số cho useUsers (V1 page.tsx) */
export function toUsersQuery(f: PeopleFilters) {
  return {
    search: f.search || undefined,
    roleId: f.roleId || undefined,
    isActive: f.status === 'all' ? undefined : f.status === 'active',
    createdFrom: f.createdFrom || undefined,
    createdTo: f.createdTo || undefined,
    page: f.page,
  };
}

/** Link Xuất CSV (V1 page.tsx, mở tab mới) */
export function exportHref(f: PeopleFilters): string {
  const p = new URLSearchParams();
  if (f.search) p.set('search', f.search);
  if (f.roleId) p.set('roleId', f.roleId);
  if (f.status !== 'all') p.set('isActive', String(f.status === 'active'));
  if (f.createdFrom) p.set('createdFrom', f.createdFrom);
  if (f.createdTo) p.set('createdTo', f.createdTo);
  return `/api/hr/users/export?${p.toString()}`;
}

/** Số bộ lọc đang bật (không tính ô tìm) */
export const filterCount = (f: PeopleFilters) =>
  (f.roleId ? 1 : 0) + (f.status !== 'all' ? 1 : 0) + (f.createdFrom || f.createdTo ? 1 : 0);

/** Đổi 1 bộ lọc → về trang 1 (V1 về trang 1 khi đổi tìm/vai trò/trạng thái/ngày) */
export function withFilter<K extends Exclude<keyof PeopleFilters, 'page'>>(f: PeopleFilters, k: K, v: PeopleFilters[K]): PeopleFilters {
  return { ...f, [k]: v, page: 1 };
}
