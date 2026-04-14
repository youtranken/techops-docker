'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface MyPermissions {
  visibleMenus: string[];
  featurePermissions: Record<string, string[]>;
}

async function fetchMyPermissions(userId: string): Promise<MyPermissions> {
  const res = await fetch(`/api/hr/sidebar-permissions?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch permissions');
  const json = await res.json() as { data: MyPermissions };
  return json.data;
}

/**
 * Returns the current user's sidebar permissions.
 * - Privileged users (ADMIN/BOSS) always have all features → returns null (caller should treat as full access).
 * - Non-privileged users get their stored featurePermissions from DB.
 */
export function useMyPermissions() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const role = session?.user?.role?.name ?? '';
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';

  const query = useQuery<MyPermissions>({
    queryKey: ['my-permissions', userId],
    queryFn: () => fetchMyPermissions(userId!),
    enabled: !isPrivileged && Boolean(userId),
    staleTime: 60_000,
  });

  /**
   * Returns true if the current user has the given feature permission for a menu.
   * Privileged users always return true.
   */
  function hasFeature(menuKey: string, featureKey: string): boolean {
    if (isPrivileged) return true;
    const features = query.data?.featurePermissions[menuKey] ?? [];
    return features.includes(featureKey);
  }

  return { hasFeature, isPrivileged, isLoading: query.isLoading };
}
