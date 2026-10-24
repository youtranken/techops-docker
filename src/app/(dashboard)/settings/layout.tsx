import { auth } from '@/lib/auth';
import { requireSettingsFeature } from '@/lib/settings-guard';
import { sidebarPermissionService } from '@/modules/hr/permissions/services/sidebar-permission.service';
import { settingsSections } from '@/modules/settings/lib/settings-nav';
import { SettingsShell } from '@/modules/settings/components/shell/SettingsShell';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Guard V1: EMPLOYEE phải có 'settings' trong visibleMenus mới vào được
  await requireSettingsFeature();

  // A3-7: mục của nav con theo đúng luật V1 (vai trò + featurePermissions['settings'])
  const session = await auth();
  const role = session?.user?.role?.name ?? '';
  const privileged = role === 'ADMIN' || role === 'BOSS';
  const feats = privileged || !session?.user
    ? []
    : ((await sidebarPermissionService.getForUser(session.user.id))?.featurePermissions?.['settings'] ?? []);

  return (
    <SettingsShell sections={settingsSections(role, feats)} employee={!privileged}>
      {children}
    </SettingsShell>
  );
}
