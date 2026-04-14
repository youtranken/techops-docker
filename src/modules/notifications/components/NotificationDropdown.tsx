'use client';

import { useRouter } from 'next/navigation';
import { CheckCheck, InboxIcon } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import type { NotificationWithTask } from '../services/notification.service';

function groupByDate(notifications: NotificationWithTask[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const today: NotificationWithTask[] = [];
  const yesterday: NotificationWithTask[] = [];
  const older: NotificationWithTask[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (d >= todayStart) today.push(n);
    else if (d >= yesterdayStart) yesterday.push(n);
    else older.push(n);
  }

  return { today, yesterday, older };
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="px-4 py-2 sticky top-0 bg-white dark:bg-[#18181b] z-10">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </span>
    </div>
  );
}

interface NotificationDropdownProps {
  autoMarkedOnOpen: boolean;
}

export function NotificationDropdown({ autoMarkedOnOpen }: NotificationDropdownProps) {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const showMarkAllButton = unreadCount > 0 && !autoMarkedOnOpen;
  const { today, yesterday, older } = groupByDate(notifications);

  function handleItemClick(id: string, taskId?: string | null) {
    markAsRead.mutate(id);
    if (taskId) router.push(`/tasks/${taskId}`);
  }

  return (
    <div className="flex flex-col">

      <div className="flex items-center justify-between px-4 py-3.5
        bg-gray-50/80 dark:bg-white/[0.04]
        border-b border-gray-200/70 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-[13px] text-gray-900 dark:text-white tracking-tight">
            Thông báo
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full bg-blue-600 text-white leading-none">
              {unreadCount}
            </span>
          )}
        </div>

        {showMarkAllButton && (
          <button
            onClick={() => markAllAsRead.mutate()}
            className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Đọc tất cả
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[420px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-500">
            <span className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
              <InboxIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Không có thông báo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Mọi thứ đang yên tĩnh</p>
            </div>
          </div>
        ) : (
          <div>
            {today.length > 0 && (
              <>
                <GroupLabel label="Hôm nay" />
                <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {today.map((n) => (
                    <NotificationItem key={n.id} notification={n} onMarkRead={(id) => handleItemClick(id, n.task?.id)} />
                  ))}
                </div>
              </>
            )}

            {yesterday.length > 0 && (
              <>
                <GroupLabel label="Hôm qua" />
                <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {yesterday.map((n) => (
                    <NotificationItem key={n.id} notification={n} onMarkRead={(id) => handleItemClick(id, n.task?.id)} />
                  ))}
                </div>
              </>
            )}

            {older.length > 0 && (
              <>
                <GroupLabel label="Cũ hơn" />
                <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {older.map((n) => (
                    <NotificationItem key={n.id} notification={n} onMarkRead={(id) => handleItemClick(id, n.task?.id)} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
