import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, LayoutList, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsMenuProps {
  collapsed: boolean;
  isPrivileged: boolean;
}

const ANALYTICS_ITEMS = [
  { label: 'Tổng quan',      href: '/analytics',           icon: BarChart2   },
  { label: 'Danh sách Task', href: '/analytics/task-list', icon: LayoutList  },
];

export function AnalyticsMenu({ collapsed, isPrivileged }: AnalyticsMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = pathname.startsWith('/analytics');

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  if (collapsed) {
    return (
      <Link
        href="/analytics"
        title="Analytics"
        className={cn(
          'flex items-center justify-center rounded-lg py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white',
        )}
      >
        <BarChart2 className="w-5 h-5 shrink-0" />
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-600/80 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white',
        )}
      >
        <BarChart2 className="w-5 h-5 shrink-0" />
        <span className="flex-1 text-left">Analytics</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
          {ANALYTICS_ITEMS.map((item) => {
            if (item.href === '/analytics/task-list' && !isPrivileged) return null;
            const active = item.href === '/analytics'
              ? pathname === '/analytics'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
