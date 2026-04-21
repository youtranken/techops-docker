import { requireSettingsFeature } from '@/lib/settings-guard';
import { ReportTemplatesSection } from '@/modules/settings/components/ReportTemplatesSection';

export default async function CompletionTemplatesPage() {
  await requireSettingsFeature('completion_templates');
  return <ReportTemplatesSection />;
}
