/**
 * Type definitions for Sidebar components
 */

export interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: string[];
  key: string;
}

export interface MenuGroup {
  label: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    feat?: string;
  }[];
}

export interface SidebarState {
  collapsed: boolean;
  hrOpen: boolean;
  permOpen: boolean;
  settingsOpen: boolean;
  visibleMenus: string[];
  featurePerms: Record<string, string[]>;
  menuLoaded: boolean;
}
