'use client';

import { useQuery } from '@tanstack/react-query';
import type { TaskStatus, WorkflowMode } from '@prisma/client';

export interface RoleAction {
  status: TaskStatus;
  workflowMode: WorkflowMode;
  action: string;
  isForceModeLocked: boolean;
}

export interface UserRoleActionsData {
  user: {
    id: string;
    username: string;
    displayName: string;
    roleId: string;
    role: { id: string; name: string; label: string };
  };
  roleActions: RoleAction[];
}

export function useRoleActions(userId: string) {
  return useQuery<UserRoleActionsData>({
    queryKey: ['rbac', 'role-actions', userId],
    queryFn: async () => {
      const res = await fetch(`/api/hr/users/${userId}/role-actions`);
      if (!res.ok) throw new Error('Failed to fetch role actions');
      return res.json();
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
}
