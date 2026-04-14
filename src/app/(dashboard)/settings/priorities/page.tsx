import { requireSettingsFeature } from '@/lib/settings-guard';
import { PrioritiesSection } from '@/modules/settings/components/PrioritiesSection';

export default async function PrioritiesPage() {
  await requireSettingsFeature('priorities');
  return <PrioritiesSection />;
}
