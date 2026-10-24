import { requireSettingsFeature } from '@/lib/settings-guard';
import { PrioritiesPage } from '@/modules/settings/components/catalog/PrioritiesPage';

export default async function Page() {
  await requireSettingsFeature('priorities');
  return <PrioritiesPage />;
}
