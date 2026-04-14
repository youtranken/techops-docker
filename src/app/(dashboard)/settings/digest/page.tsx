import { requireSettingsFeature } from '@/lib/settings-guard';
import { DigestSection } from '@/modules/settings/components/DigestSection';

export default async function DigestPage() {
  await requireSettingsFeature(); // Admin/Boss always allowed, Employee redirected to /
  return <DigestSection />;
}
