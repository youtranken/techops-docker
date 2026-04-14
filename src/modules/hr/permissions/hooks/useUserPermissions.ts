'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface UserPermissions {
  visibleMenus: string[];
  featurePermissions: Record<string, string[]>;
}

async function fetchUserPermissions(userId: string): Promise<UserPermissions> {
  const res = await fetch(`/api/hr/sidebar-permissions?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch permissions');
  const json = await res.json();
  return json.data;
}

/**
 * Hook để lấy permissions của user hiện tại.
 * Trả về { visibleMenus, featurePermissions } hoặc defaults nếu chưa có session.
 */
export function useUserPermissions() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery<UserPermissions>({
    queryKey: ['user-permissions', userId],
    queryFn: () => fetchUserPermissions(userId!),
    enabled: !!userId,
    staleTime: 60_000, // Cache 1 phút
    // Default values khi chưa có data
    placeholderData: {
      visibleMenus: ['logs', 'analytics', 'helpdesk', 'hr'],
      featurePermissions: {
        logs: ['task_activity', 'user_activity'],
        hr: ['edit', 'change_password', 'deactivate', 'delete'],
      },
    },
  });
}

/**
 * Helper để check xem user có feature permission không.
 * @param menuKey - Menu key (vd: 'settings')
 * @param featureKey - Feature key (vd: 'notifications')
 * @param permissions - Data từ useUserPermissions()
 */
export function hasFeaturePermission(
  menuKey: string,
  featureKey: string,
  permissions: UserPermissions | undefined
): boolean {
  if (!permissions) return false;
  const features = permissions.featurePermissions[menuKey] || [];
  return features.includes(featureKey);
}
