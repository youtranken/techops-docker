import type { Role } from '@prisma/client';

export interface UserPermRow {
  id: string;
  displayName: string;
  username: string;
  role: Role;
  visibleMenus: string[];
  featurePermissions: Record<string, string[]>;
}

export interface MenuFeature {
  key: string;
  label: string;
}

export interface MenuConfig {
  key: string;
  label: string;
  features: MenuFeature[];
}

export interface SavePermissionInput {
  userId: string;
  visibleMenus: string[];
  featurePermissions: Record<string, string[]>;
}
