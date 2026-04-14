import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { permissionService } from '@/modules/rbac/services/permission.service';
import { prisma } from '@/lib/prisma';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

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
      { error: { code: 'PERMISSION_DENIED', message: `Action '${actionName}' not permitted` } },
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
  const visibleMenus: string[] = record ? (JSON.parse(record.visibleMenus) as string[]) : [];

  if (!visibleMenus.includes('settings')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      { status: 403 },
    );
  }

  const featurePerms: Record<string, string[]> = record
    ? (JSON.parse(record.featurePermissions) as Record<string, string[]>)
    : {};

  if (!(featurePerms['settings'] ?? []).includes(featureKey)) {
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
