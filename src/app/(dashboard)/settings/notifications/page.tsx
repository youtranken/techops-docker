import { requireSettingsFeature } from '@/lib/settings-guard';
import { NotificationsPage } from '@/modules/settings/components/config/NotificationsPage';

export default async function Page() {
  await requireSettingsFeature('notifications');
  return <NotificationsPage />;
}
