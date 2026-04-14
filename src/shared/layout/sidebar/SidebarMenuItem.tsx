import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { MenuItem } from './types';

interface SidebarMenuItemProps {
  item: MenuItem;
  isActive: boolean;
  collapsed: boolean;
}

/**
 * Simple sidebar menu item (non-dropdown)
 */
export function SidebarMenuItem({ item, isActive, collapsed }: SidebarMenuItemProps) {
  const Icon = item.icon;
  
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}
