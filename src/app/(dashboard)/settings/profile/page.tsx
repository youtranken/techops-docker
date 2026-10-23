import { requireSettingsFeature } from '@/lib/settings-guard';
import { ProfilePage } from '@/modules/settings/components/profile/ProfilePage';

export default async function Page() {
  await requireSettingsFeature('profile'); // V1: nhân viên cần quyền Cài đặt › Hồ sơ
  return <ProfilePage />;
}
