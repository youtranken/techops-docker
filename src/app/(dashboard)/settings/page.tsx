import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { sidebarPermissionService } from '@/modules/hr/permissions/services/sidebar-permission.service';

const FEATURE_REDIRECTS = [
  { feature: 'priorities',   href: '/settings/priorities' },
  { feature: 'task_types',   href: '/settings/task-types' },
  { feature: 'profile',      href: '/settings/profile' },
  { feature: 'notifications',href: '/settings/notifications' },
] as const;

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role?.name ?? '';
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';
  if (isPrivileged) redirect('/settings/priorities');

  // EMPLOYEE: redirect to first permitted settings page
  const perm = await sidebarPermissionService.getForUser(session.user.id);
  const features = perm?.featurePermissions?.['settings'] ?? [];
  const first = FEATURE_REDIRECTS.find((p) => features.includes(p.feature));
  redirect(first?.href ?? '/');
}
