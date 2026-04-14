import { prisma } from '@/lib/prisma';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

/**
 * 3-Tier Permission Check
 *
 * Tier 1: UserStatusAction overrides (REVOKE → deny, GRANT → allow)
 * Tier 2: RoleStatusAction 3D matrix (role × status × workflowMode)
 *          + Force-mode lock check
 * Tier 3: Basic RolePermission (resource:action)
 * Default: DENY
 */
class PermissionService {
  // ─── Tier helpers ────────────────────────────────────────────────────────────

  private async getUserRole(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true, role: { select: { name: true } } },
    });
    if (!user) throw Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND' });
    return user;
  }

  // ─── Main: check single action ───────────────────────────────────────────────

  async checkPermission(
    userId: string,
    taskStatus: TaskStatus,
    workflowMode: WorkflowMode,
    actionName: string,
    isForceMode = false,
  ): Promise<boolean> {
    const { roleId } = await this.getUserRole(userId);

    // Tier 1: User-level override
    const override = await prisma.userStatusAction.findUnique({
      where: {
        userId_status_workflowMode_action: {
          userId,
          status: taskStatus,
          workflowMode,
          action: actionName,
        },
      },
    });

    if (override) {
      if (override.override === 'REVOKE') return false;
      if (override.override === 'GRANT') return true;
    }

    // Tier 2: Role × Status × WorkflowMode matrix
    const rsa = await prisma.roleStatusAction.findUnique({
      where: {
        roleId_status_workflowMode_action: {
          roleId,
          status: taskStatus,
          workflowMode,
          action: actionName,
        },
      },
    });

    if (rsa) {
      // Force-mode lock: deny if action is locked and task is in force mode
      if (rsa.isForceModeLocked && isForceMode) return false;
      return true;
    }

    // Tier 3: Basic role permission (resource:action) — fallback
    // Map workflow action names to resource:action pairs
    const resourceActionMap: Record<string, { resource: string; action: string }> = {
      VIEW: { resource: 'TASK', action: 'READ' },
      EDIT: { resource: 'TASK', action: 'UPDATE' },
      DELETE: { resource: 'TASK', action: 'DELETE' },
      CANCEL: { resource: 'TASK', action: 'CANCEL' },
      TRANSFER: { resource: 'TASK', action: 'TRANSFER' },
      APPROVE: { resource: 'TASK', action: 'APPROVE' },
      REJECT: { resource: 'TASK', action: 'REJECT' },
    };

    const mapped = resourceActionMap[actionName];
    if (mapped) {
      return this.hasRolePermission(userId, mapped.resource, mapped.action);
    }

    // Default: DENY
    return false;
  }

  // ─── Get all allowed actions for user at given status ────────────────────────

  async getAllowedActions(
    userId: string,
    taskStatus: TaskStatus,
    workflowMode: WorkflowMode,
    isForceMode = false,
  ): Promise<string[]> {
    const { roleId } = await this.getUserRole(userId);

    // Get role's matrix actions for this status/mode
    const rsaRows = await prisma.roleStatusAction.findMany({
      where: { roleId, status: taskStatus, workflowMode },
    });

    // Start with role matrix actions (apply force-mode lock)
    const allowed = new Set<string>(
      rsaRows
        .filter((r) => !(r.isForceModeLocked && isForceMode))
        .map((r) => r.action),
    );

    // Apply user overrides
    const userOverrides = await prisma.userStatusAction.findMany({
      where: { userId, status: taskStatus, workflowMode },
    });

    for (const override of userOverrides) {
      if (override.override === 'REVOKE') allowed.delete(override.action);
      if (override.override === 'GRANT') allowed.add(override.action);
    }

    return Array.from(allowed);
  }

  // ─── Basic role permission check (resource:action) ───────────────────────────

  async hasRolePermission(userId: string, resource: string, action: string): Promise<boolean> {
    const { roleId } = await this.getUserRole(userId);

    const perm = await prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
    });
    if (!perm) return false;

    const rolePerm = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId: perm.id } },
    });

    return Boolean(rolePerm);
  }

  // ─── List user-level overrides for a user ────────────────────────────────────

  async getUserOverrides(userId: string) {
    return prisma.userStatusAction.findMany({
      where: { userId },
      include: { role: true },
      orderBy: [{ status: 'asc' }, { action: 'asc' }],
    });
  }

  // ─── Grant / Revoke user override ────────────────────────────────────────────

  async grantOverride(
    userId: string,
    status: TaskStatus,
    workflowMode: WorkflowMode,
    action: string,
  ) {
    const { roleId } = await this.getUserRole(userId);

    return prisma.userStatusAction.upsert({
      where: { userId_status_workflowMode_action: { userId, status, workflowMode, action } },
      update: { override: 'GRANT' },
      create: { userId, roleId, status, workflowMode, action, override: 'GRANT' },
    });
  }

  async revokeOverride(
    userId: string,
    status: TaskStatus,
    workflowMode: WorkflowMode,
    action: string,
  ) {
    const { roleId } = await this.getUserRole(userId);

    return prisma.userStatusAction.upsert({
      where: { userId_status_workflowMode_action: { userId, status, workflowMode, action } },
      update: { override: 'REVOKE' },
      create: { userId, roleId, status, workflowMode, action, override: 'REVOKE' },
    });
  }

  async deleteOverride(
    userId: string,
    status: TaskStatus,
    workflowMode: WorkflowMode,
    action: string,
  ) {
    return prisma.userStatusAction.delete({
      where: { userId_status_workflowMode_action: { userId, status, workflowMode, action } },
    });
  }
}

export const permissionService = new PermissionService();
