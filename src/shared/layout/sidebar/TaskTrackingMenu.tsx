'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Star, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskCounters } from '@/modules/tasks/hooks/useTaskTracking';

interface Props { collapsed: boolean }

/** V2 — mục con dưới "Tasks" cho Boss/Admin: ★ Quan trọng, Hoàn thành – chưa xem (kèm số đếm). */
export function TaskTrackingMenu({ collapsed }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data } = useTaskCounters(true);
  const currentView = pathname === '/tasks' ? searchParams.get('view') : null;

  const items = [
    { view: 'important', label: 'Quan trọng', Icon: Star, count: data?.important ?? 0, iconCls: 'text-amber-400', badgeCls: 'bg-amber-500' },
    { view: 'unseen', label: 'Hoàn thành – chưa xem', Icon: CheckCheck, count: data?.unseen ?? 0, iconCls: 'text-emerald-400', badgeCls: 'bg-emerald-500' },
  ];

  return (
    <>
      {items.map(({ view, label, Icon, count, iconCls, badgeCls }) => {
        const active = currentView === view;
        return (
          <Link
            key={view}
            href={`/tasks?view=${view}`}
            title={collapsed ? `${label}${count ? ` (${count})` : ''}` : undefined}
            className={cn(
              'relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0' : 'pl-9 pr-3',
              active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', !active && iconCls, view === 'important' && 'fill-current')} />
            {!collapsed && <span className="flex-1 leading-tight">{label}</span>}
            {count > 0 && (
              <span className={cn(
                'text-[10px] font-bold text-white rounded-full px-1.5 min-w-[18px] text-center',
                badgeCls,
                collapsed && 'absolute -top-0.5 right-1',
              )}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}
