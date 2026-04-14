import { requireSettingsFeature } from '@/lib/settings-guard';
import { TaskTypesSection } from '@/modules/settings/components/TaskTypesSection';

export default async function TaskTypesPage() {
  await requireSettingsFeature('task_types');
  return <TaskTypesSection />;
}
