'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Users, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyPermissions } from '@/shared/hooks/useMyPermissions';

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  featureKey: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/logs/task-activity',
    label: 'Task Activity',
    description: 'Lịch sử hành động trên task',
    icon: ClipboardList,
    featureKey: 'task_activity',
  },
  {
    href: '/logs/user-activity',
    label: 'User Activity',
    description: 'Phiên đăng nhập & hoạt động',
    icon: Users,
    featureKey: 'user_activity',
  },
  {
    href: '/logs/task-reference',
    label: 'Task Reference',
    description: 'TaskCode ↔ TaskID tra cứu',
    icon: Hash,
    featureKey: 'task_reference',
  },
];

export function LogsNav() {
  const pathname = usePathname();
  const { hasFeature } = useMyPermissions();

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasFeature('logs', item.featureKey),
  );

  return (
    <nav className="flex gap-1 border-b border-border">
      {visibleItems.map(({ href, label, description, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'group flex items-center gap-2.5 px-4 py-3 text-sm font-medium',
              'border-b-2 -mb-px transition-all duration-150',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
            <span className="hidden sm:block">{label}</span>
            <span className="sr-only sm:hidden">{description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
