import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { sidebarPermissionService } from '@/modules/hr/permissions/services/sidebar-permission.service';

export default async function LogsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role?.name ?? '';
  const isPrivileged = role === 'ADMIN' || role === 'BOSS';
  if (isPrivileged) redirect('/logs/task-activity');

  const perm = await sidebarPermissionService.getForUser(session.user.id);
  const features = perm?.featurePermissions?.['logs'] ?? [];

  if (features.includes('task_activity')) redirect('/logs/task-activity');
  if (features.includes('user_activity')) redirect('/logs/user-activity');
  redirect('/');
}
