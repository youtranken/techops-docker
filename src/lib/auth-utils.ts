import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { permissionService } from '@/modules/rbac/services/permission.service';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

function safeParseArray(raw: string): string[] {
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

function safeParseRecord(raw: string): Record<string, string[]> {
  try {
    const p = JSON.parse(raw);
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, string[]>) : {};
  } catch { return {}; }
}

/**
 * Get the currently authenticated user from session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Require authentication. Returns the user or a 401 JSON response.
 * Also checks isActive / isDeleted via Redis cache (TTL 30s) — deactivate user ngắt session ≤30s.
 * Usage: const user = await requireAuth(); if (user instanceof NextResponse) return user;
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }

  // Check isActive via cache (TTL 30s) — invalidated immediately on deactivate
  // S2: fail-closed nếu DB lỗi (return 401 thay vì throw 500)
  const CACHE_KEY = `user:active:${user.id}`;
  let isActive = await cache.get<boolean>(CACHE_KEY);
  if (isActive === null) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isActive: true },
      });
      isActive = !!dbUser?.isActive;
      await cache.set(CACHE_KEY, isActive, 30);
    } catch (err) {
      console.error('[requireAuth] DB error checking isActive → fail-closed:', err);
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Không thể xác thực phiên — thử lại' } },
        { status: 401 },
      );
    }
  }

  if (!isActive) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Tài khoản đã bị vô hiệu hóa' } },
      { status: 401 },
    );
  }

  return user;
}

/**
 * Require authentication AND a specific role.
 * Returns the user or a 401/403 JSON response.
 */
export async function requireRole(roles: string[]) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user; // propagate 401

  if (!roles.includes(user.role.name)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }
  return user;
}

/**
 * Require that the current user has a specific task-action permission.
 * Combines requireAuth + 3-tier RBAC check.
 *
 * Returns the user if allowed, or a 401/403 NextResponse.
 */
export async function requirePermission(
  taskStatus: TaskStatus,
  workflowMode: WorkflowMode,
  actionName: string,
  isForceMode = false,
) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const allowed = await permissionService.checkPermission(
    user.id,
    taskStatus,
    workflowMode,
    actionName,
    isForceMode,
  );

  if (!allowed) {
    return NextResponse.json(
      { error: { code: 'PERMISSION_DENIED', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  return user;
}

/**
 * API-level guard for Settings mutations (create/update/delete).
 * - ADMIN/BOSS: always allowed.
 * - EMPLOYEE: must have 'settings' in visibleMenus AND featureKey in
 *   featurePermissions['settings'] (set via HR → Phân quyền panel).
 *
 * @param featureKey  e.g. 'priorities' | 'task_types'
 */
export async function requireSettingsPermission(featureKey: string) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);
  if (isPrivileged) return user;

  // EMPLOYEE: read SidebarPermission record from DB
  const record = await prisma.sidebarPermission.findUnique({ where: { userId: user.id } });
  const visibleMenus = record ? safeParseArray(record.visibleMenus) : [];

  if (!visibleMenus.includes('settings')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  const featurePerms = record ? safeParseRecord(record.featurePermissions) : {};

  if (!(featurePerms['settings'] ?? []).includes(featureKey)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  return user;
}

/**
 * API-level guard cho bất kỳ menu nào trong sidebar.
 * - ADMIN/BOSS: luôn được phép.
 * - EMPLOYEE: phải có menuKey trong visibleMenus (SidebarPermission).
 *
 * Trả về user nếu được phép, NextResponse 401/403 nếu không.
 */
export async function requireMenuPermission(menuKey: string) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;

  const isPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);
  if (isPrivileged) return user;

  const record = await prisma.sidebarPermission.findUnique({ where: { userId: user.id } });
  const visibleMenus = record ? safeParseArray(record.visibleMenus) : [];

  if (!visibleMenus.includes(menuKey)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  return user;
}

export function validateSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;

  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!rawHost) return true;

  try {
    const effectiveHost = rawHost.split(',')[0].trim();
    return new URL(origin).host === effectiveHost;
  } catch {
    return false;
  }
}
