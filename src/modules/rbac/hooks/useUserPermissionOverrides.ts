'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskStatus, WorkflowMode, OverrideType } from '@prisma/client';

export interface UserPermissionOverride {
  id: string;
  userId: string;
  roleId: string;
  status: TaskStatus;
  workflowMode: WorkflowMode;
  action: string;
  override: OverrideType;
  role: { id: string; name: string; label: string };
}

async function fetchOverrides(userId: string): Promise<UserPermissionOverride[]> {
  const res = await fetch(`/api/hr/users/${userId}/permissions`);
  if (!res.ok) throw new Error('Failed to fetch permission overrides');
  const body = await res.json();
  return body.data ?? [];
}

export function useUserPermissionOverrides(userId: string) {
  return useQuery<UserPermissionOverride[]>({
    queryKey: ['rbac', 'overrides', userId],
    queryFn: () => fetchOverrides(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

interface OverrideInput {
  userId: string;
  status: TaskStatus;
  workflowMode: WorkflowMode;
  action: string;
  type: 'GRANT' | 'REVOKE';
}

async function upsertOverride(input: OverrideInput): Promise<UserPermissionOverride> {
  const { userId, ...body } = input;
  const res = await fetch(`/api/hr/users/${userId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to update permission');
  return data.data;
}

interface DeleteInput {
  userId: string;
  status: TaskStatus;
  workflowMode: WorkflowMode;
  action: string;
}

async function deleteOverride(input: DeleteInput): Promise<void> {
  const { userId, ...body } = input;
  const res = await fetch(`/api/hr/users/${userId}/permissions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message ?? 'Failed to remove override');
  }
}

export function useUpsertOverride(userId: string) {
  const queryClient = useQueryClient();
  return useMutation<UserPermissionOverride, Error, OverrideInput>({
    mutationFn: upsertOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'overrides', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions', userId] });
    },
  });
}

export function useDeleteOverride(userId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteInput>({
    mutationFn: deleteOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac', 'overrides', userId] });
      queryClient.invalidateQueries({ queryKey: ['permissions', userId] });
    },
  });
}
