import { requireSettingsFeature } from '@/lib/settings-guard';
import { TemplatesPage } from '@/modules/settings/components/catalog/TemplatesPage';

export default async function CompletionTemplatesPage() {
  await requireSettingsFeature('completion_templates');
  return <TemplatesPage />;
}
