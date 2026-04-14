import { cn } from '@/lib/utils';

interface SidebarLogoProps {
  collapsed: boolean;
}

export function SidebarLogo({ collapsed }: SidebarLogoProps) {
  return (
    <div
      className={cn(
        'flex items-center h-16 border-b border-gray-700/50 shrink-0 overflow-hidden',
        collapsed ? 'justify-center px-0' : 'px-4 gap-2.5'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-pmh.png"
        alt="PMH Logo"
        className="w-11 h-11 object-contain shrink-0"
      />
      {!collapsed && (
        <span className="font-bold text-lg tracking-tight whitespace-nowrap truncate">Phú Mỹ Hưng</span>
      )}
    </div>
  );
}
