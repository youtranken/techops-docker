import { requireSettingsFeature } from '@/lib/settings-guard';
import { AvatarSection } from '@/modules/settings/components/AvatarSection';
import { ChangePasswordSection } from '@/modules/settings/components/ChangePasswordSection';

export default async function ProfilePage() {
  await requireSettingsFeature('profile');
  return (
    <div className="space-y-8">
      <AvatarSection />
      <div className="border-t pt-6">
        <ChangePasswordSection />
      </div>
    </div>
  );
}
