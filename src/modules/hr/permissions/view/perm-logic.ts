/**
 * Logic thuần trang Phân quyền V2 (A3-4) — quyền menu theo TỪNG nhân viên như V1 (SidebarPermission).
 * V1 lưu ngay mỗi lần bật/tắt (PUT đủ visibleMenus + featurePermissions); V2 gom các lần bật/tắt vào bản nháp
 * rồi gửi đúng 1 PUT cùng dạng body. Mỗi lần bật/tắt áp đúng phép biến đổi V1 (PermissionsMatrixSection).
 */
import { MENU_CONFIG } from '../config';
import type { MenuConfig, SavePermissionInput } from '../types';

export interface MenuPerm {
  visibleMenus: string[];
  featurePermissions: Record<string, string[]>;
}

/** Mặc định khi nhân viên chưa có bản ghi (api/hr/sidebar-permissions/route.ts) */
export const DEFAULT_PERM: MenuPerm = {
  visibleMenus: ['logs', 'analytics', 'helpdesk', 'hr'],
  featurePermissions: { logs: ['task_activity', 'user_activity'], hr: ['edit', 'change_password', 'deactivate', 'delete'] },
};

/** V1 handleMenuToggle: tắt menu thì xoá luôn danh sách tính năng của menu đó */
export function toggleMenu(p: MenuPerm, menuKey: string, checked: boolean): MenuPerm {
  const visibleMenus = checked ? [...p.visibleMenus, menuKey] : p.visibleMenus.filter((m) => m !== menuKey);
  const featurePermissions = { ...p.featurePermissions };
  if (!checked) delete featurePermissions[menuKey];
  return { visibleMenus, featurePermissions };
}

/** V1 handleFeatureToggle */
export function toggleFeature(p: MenuPerm, menuKey: string, featureKey: string, checked: boolean): MenuPerm {
  const current = p.featurePermissions[menuKey] ?? [];
  return {
    visibleMenus: p.visibleMenus,
    featurePermissions: { ...p.featurePermissions, [menuKey]: checked ? [...current, featureKey] : current.filter((f) => f !== featureKey) },
  };
}

/** Trạng thái hiển thị (V1 PermissionsTable): tính năng chỉ "bật" khi menu bật */
export const menuOn = (p: MenuPerm, menuKey: string) => p.visibleMenus.includes(menuKey);
export const featureOn = (p: MenuPerm, menuKey: string, featureKey: string) =>
  menuOn(p, menuKey) && (p.featurePermissions[menuKey] ?? []).includes(featureKey);

/** Các công tắc (menu + tính năng) */
export function switchKeys(menus: readonly MenuConfig[] = MENU_CONFIG): string[] {
  return menus.flatMap((m) => [m.key, ...m.features.map((f) => `${m.key}.${f.key}`)]);
}
export function switchOn(p: MenuPerm, key: string): boolean {
  const [m, f] = key.split('.');
  return f ? featureOn(p, m, f) : menuOn(p, m);
}

/** Số công tắc khác nhau giữa 2 cấu hình (dùng cho thanh lưu / so mặc định) */
export function changeCount(a: MenuPerm, b: MenuPerm, menus: readonly MenuConfig[] = MENU_CONFIG): number {
  return switchKeys(menus).filter((k) => switchOn(a, k) !== switchOn(b, k)).length;
}

export const differsFromDefault = (p: MenuPerm) => changeCount(p, DEFAULT_PERM) > 0;

/** Body PUT /api/hr/sidebar-permissions (V1) */
export function savePayload(userId: string, p: MenuPerm): SavePermissionInput {
  return { userId, visibleMenus: p.visibleMenus, featurePermissions: p.featurePermissions };
}

/** Lọc ma trận theo trang con V1 (/hr/permissions/{logs,users,analytics,helpdesk,settings}) */
export const PERM_ROUTE_MENU: Record<string, string> = { logs: 'logs', users: 'hr', analytics: 'analytics', helpdesk: 'helpdesk', settings: 'settings' };
export function menusFor(filter?: string | null): MenuConfig[] {
  return filter ? MENU_CONFIG.filter((m) => m.key === filter) : MENU_CONFIG;
}

/** Tìm nhân viên theo tên / tên đăng nhập, không phân biệt dấu */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}
export function matchUser(u: { displayName: string; username: string }, q: string): boolean {
  const k = fold(q);
  return !k || fold(`${u.displayName} ${u.username}`).includes(k);
}
