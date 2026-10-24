import { requireSettingsFeature } from '@/lib/settings-guard';
import { DigestPage } from '@/modules/settings/components/config/DigestPage';

export default async function Page() {
  await requireSettingsFeature(); // Admin/Boss always allowed, Employee redirected to /
  return <DigestPage />;
}
