import { requireSettingsFeature } from '@/lib/settings-guard';
import { AvatarSection } from '@/modules/settings/components/AvatarSection';

export default async function ProfilePage() {
  await requireSettingsFeature('profile');
  return <AvatarSection />;
}
