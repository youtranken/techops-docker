import { requireMenuAccess } from '@/lib/settings-guard';
import { UserLogView } from '@/modules/logs/components/LogsPage/UserLogView';
export const metadata = { title: 'User Activity — Audit Logs' };

export default async function UserActivityPage() {
  await requireMenuAccess('logs', 'user_activity');
  return <UserLogView />;
}
