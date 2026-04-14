import { requireMenuAccess } from '@/lib/settings-guard';
import { UserActivitySection } from '@/modules/logs/sections/UserActivitySection';
export const metadata = { title: 'User Activity — Audit Logs' };

export default async function UserActivityPage() {
  await requireMenuAccess('logs', 'user_activity');
  return <UserActivitySection />;
}
