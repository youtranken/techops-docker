'use client';

import { Shield } from 'lucide-react';
import type { UserPermRow } from '../types';
import { MENU_CONFIG } from '../config';
import { useSidebarPermissions, useSavePermission } from '../hooks/useSidebarPermissions';
import { PermissionsTable } from '../components/PermissionsTable';

interface Props {
  /** Filter which menus to show — shows all if omitted */
  filterMenus?: string[];
}

export function PermissionsMatrixSection({ filterMenus }: Props) {
  const { data, isLoading, isError } = useSidebarPermissions();
  const save = useSavePermission();


  const menus = filterMenus
    ? MENU_CONFIG.filter((m) => filterMenus.includes(m.key))
    : MENU_CONFIG;

  function handleMenuToggle(user: UserPermRow, menuKey: string, checked: boolean) {
    const nextMenus = checked
      ? [...user.visibleMenus, menuKey]
      : user.visibleMenus.filter((m) => m !== menuKey);
    const nextFeatures = { ...user.featurePermissions };
    if (!checked) delete nextFeatures[menuKey];
    save.mutate({ userId: user.id, visibleMenus: nextMenus, featurePermissions: nextFeatures });
  }

  function handleFeatureToggle(user: UserPermRow, menuKey: string, featureKey: string, checked: boolean) {
    const current = user.featurePermissions[menuKey] ?? [];
    const nextFeatures = {
      ...user.featurePermissions,
      [menuKey]: checked ? [...current, featureKey] : current.filter((f) => f !== featureKey),
    };
    save.mutate({ userId: user.id, visibleMenus: user.visibleMenus, featurePermissions: nextFeatures });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phân quyền Sidebar</h1>
          <p className="text-sm text-muted-foreground">Kiểm soát menu và tính năng hiển thị cho từng nhân viên</p>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}
      {isError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">Không thể tải danh sách phân quyền</div>}

      {data && (
        <>
          <PermissionsTable data={data} menus={menus} isPending={save.isPending} onMenuToggle={handleMenuToggle} onFeatureToggle={handleFeatureToggle} />
          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>• <strong>Hiển thị</strong>: Menu xuất hiện trong sidebar</p>
            <p>• <strong>Sub-features</strong>: Tính năng cụ thể trong menu (vô hiệu hóa khi menu bị tắt)</p>
            <p>• ADMIN và BOSS luôn có toàn quyền, không thể chỉnh sửa</p>
          </div>
        </>
      )}
    </div>
  );
}
