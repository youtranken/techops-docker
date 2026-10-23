import { requireSettingsFeature } from '@/lib/settings-guard';
import { SettingsHeader } from '@/modules/settings/components/SettingsHeader';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Guard: EMPLOYEE phải có 'settings' trong visibleMenus mới vào được
  await requireSettingsFeature();

  return (
    <div className="space-y-6">
      <SettingsHeader />
      {children}
    </div>
  );
}
