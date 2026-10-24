import { requireSettingsFeature } from '@/lib/settings-guard';
import { TaskTypesPage } from '@/modules/settings/components/catalog/TaskTypesPage';

export default async function Page() {
  await requireSettingsFeature('task_types');
  return <TaskTypesPage />;
}
