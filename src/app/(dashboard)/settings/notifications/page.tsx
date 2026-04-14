import { requireSettingsFeature } from '@/lib/settings-guard';
import { NotificationSection } from '@/modules/settings/components/NotificationSection';

export default async function NotificationsPage() {
  await requireSettingsFeature('notifications');
  return <NotificationSection />;
}
