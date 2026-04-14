'use client';

import { useState } from 'react';
import { Bell, BellDot } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificationCount, useMarkAllAsRead } from '../hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: count = 0 } = useNotificationCount();
  const markAllAsRead = useMarkAllAsRead();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && count > 0) {
      markAllAsRead.mutate();
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Thông báo"
        >
          {count > 0 ? (
            <>
              <BellDot className="w-5 h-5" />
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none ring-2 ring-white dark:ring-gray-900">
                {count > 99 ? '99+' : count}
              </span>
            </>
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[400px] p-0 rounded-xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden
          bg-white dark:bg-[#18181b]
          shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_10px_40px_-8px_rgba(0,0,0,0.2),0_4px_16px_-4px_rgba(0,0,0,0.12)]
          dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_40px_-8px_rgba(0,0,0,0.6),0_4px_16px_-4px_rgba(0,0,0,0.4)]"
      >
        <NotificationDropdown autoMarkedOnOpen={open} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
