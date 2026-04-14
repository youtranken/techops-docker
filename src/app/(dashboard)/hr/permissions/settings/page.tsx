import { PermissionsMatrixSection } from '@/modules/hr/permissions/sections/PermissionsMatrixSection';

export default function PermissionsSettingsPage() {
  return <PermissionsMatrixSection filterMenus={['settings']} />;
}
