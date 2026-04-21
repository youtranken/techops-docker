import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { sidebarPermissionService } from '@/modules/hr/permissions/services/sidebar-permission.service';

/**
 * Server-side guard for Settings pages.
 * - ADMIN/BOSS: always allowed.
 * - EMPLOYEE: must have 'settings' in visibleMenus AND the specific featureKey in featurePermissions['settings'].
 *
 * Call at the top of Server Components (layout or page).
 * Redirects to '/' if unauthorized.
 */
export async function requireSettingsFeature(featureKey?: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role?.name ?? '';
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';
  if (isPrivileged) return; // always allowed

  // EMPLOYEE: check sidebar permission record
  const perm = await sidebarPermissionService.getForUser(session.user.id);
  const visibleMenus = perm?.visibleMenus ?? [];

  if (!visibleMenus.includes('settings')) redirect('/');

  if (featureKey) {
    const features = perm?.featurePermissions?.['settings'] ?? [];
    if (!features.includes(featureKey)) redirect('/');
  }
}

/**
 * Boolean check cho API routes — KHÔNG redirect, trả về true/false để route tự handle 403.
 * - ADMIN/BOSS: luôn được phép.
 * - EMPLOYEE: phải có featureKey trong featurePermissions['settings'].
 */
export async function canAccessSettingsFeature(userId: string, role: string, featureKey: string): Promise<boolean> {
  if (role === 'ADMIN' || role === 'BOSS') return true;
  const perm = await sidebarPermissionService.getForUser(userId);
  const features = perm?.featurePermissions?.['settings'] ?? [];
  return features.includes(featureKey);
}

/**
 * Server-side guard cho bất kỳ menu nào trong sidebar.
 * - ADMIN/BOSS: luôn được phép.
 * - EMPLOYEE: phải có menuKey trong visibleMenus.
 *              Nếu có featureKey: phải có thêm featureKey trong featurePermissions[menuKey].
 *
 * Gọi trong layout.tsx hoặc page.tsx (Server Components).
 * Redirect về '/' nếu không có quyền.
 */
export async function requireMenuAccess(menuKey: string, featureKey?: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role?.name ?? '';
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';
  if (isPrivileged) return;

  const perm = await sidebarPermissionService.getForUser(session.user.id);
  const visibleMenus = perm?.visibleMenus ?? [];

  if (!visibleMenus.includes(menuKey)) redirect('/');

  if (featureKey) {
    const features = perm?.featurePermissions?.[menuKey] ?? [];
    if (!features.includes(featureKey)) redirect('/');
  }
}
