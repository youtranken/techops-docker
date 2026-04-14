'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  CalendarClock,
  Search,
  PenLine,
  PartyPopper,
  MessageSquare,
  AlarmClock,
  Siren,
  FileText,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationWithTask } from '../services/notification.service';

const TYPE_META: Record<string, {
  icon: React.ReactNode;
  bg: string;
  darkBg: string;
  iconColor: string;
}> = {
  TASK_ASSIGNED:           { icon: <ClipboardList className="w-4 h-4" />,  bg: 'bg-blue-50',    darkBg: 'dark:bg-blue-500/10',    iconColor: 'text-blue-600 dark:text-blue-400' },
  TASK_APPROVED:           { icon: <CheckCircle className="w-4 h-4" />,    bg: 'bg-green-50',   darkBg: 'dark:bg-green-500/10',   iconColor: 'text-green-600 dark:text-green-400' },
  TASK_REJECTED:           { icon: <XCircle className="w-4 h-4" />,        bg: 'bg-red-50',     darkBg: 'dark:bg-red-500/10',     iconColor: 'text-red-600 dark:text-red-400' },
  TRANSFER_RECEIVED:       { icon: <ArrowLeftRight className="w-4 h-4" />, bg: 'bg-purple-50',  darkBg: 'dark:bg-purple-500/10',  iconColor: 'text-purple-600 dark:text-purple-400' },
  EXTENSION_REQUESTED:     { icon: <CalendarClock className="w-4 h-4" />,  bg: 'bg-yellow-50',  darkBg: 'dark:bg-yellow-500/10',  iconColor: 'text-yellow-600 dark:text-yellow-500' },
  EXTENSION_APPROVED:      { icon: <CheckCircle className="w-4 h-4" />,    bg: 'bg-green-50',   darkBg: 'dark:bg-green-500/10',   iconColor: 'text-green-600 dark:text-green-400' },
  EXTENSION_REJECTED:      { icon: <XCircle className="w-4 h-4" />,        bg: 'bg-red-50',     darkBg: 'dark:bg-red-500/10',     iconColor: 'text-red-600 dark:text-red-400' },
  REVIEW_REQUIRED:         { icon: <Search className="w-4 h-4" />,         bg: 'bg-orange-50',  darkBg: 'dark:bg-orange-500/10',  iconColor: 'text-orange-600 dark:text-orange-400' },
  REVISION_REQUIRED:       { icon: <PenLine className="w-4 h-4" />,        bg: 'bg-amber-50',   darkBg: 'dark:bg-amber-500/10',   iconColor: 'text-amber-600 dark:text-amber-500' },
  TASK_COMPLETED:          { icon: <PartyPopper className="w-4 h-4" />,    bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  COMMENT_ADDED:           { icon: <MessageSquare className="w-4 h-4" />,  bg: 'bg-sky-50',     darkBg: 'dark:bg-sky-500/10',     iconColor: 'text-sky-600 dark:text-sky-400' },
  DEADLINE_REMINDER:       { icon: <AlarmClock className="w-4 h-4" />,     bg: 'bg-red-50',     darkBg: 'dark:bg-red-500/10',     iconColor: 'text-red-600 dark:text-red-400' },
  ALL_FAILED:              { icon: <Siren className="w-4 h-4" />,          bg: 'bg-red-50',     darkBg: 'dark:bg-red-500/10',     iconColor: 'text-red-600 dark:text-red-400' },
  PLAN_APPROVAL_REQUESTED: { icon: <FileText className="w-4 h-4" />,       bg: 'bg-indigo-50',  darkBg: 'dark:bg-indigo-500/10',  iconColor: 'text-indigo-600 dark:text-indigo-400' },
};

const FALLBACK = {
  icon: <Bell className="w-4 h-4" />,
  bg: 'bg-gray-100',
  darkBg: 'dark:bg-white/[0.06]',
  iconColor: 'text-gray-500 dark:text-gray-400',
};

interface NotificationItemProps {
  notification: NotificationWithTask;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const taskCode = notification.task?.taskCode;
  const meta = TYPE_META[notification.type] ?? FALLBACK;
  const isUnread = !notification.isRead;

  return (
    <button
      onClick={() => onMarkRead(notification.id)}
      className={cn(
        'w-full text-left flex gap-3 px-4 py-3 transition-colors relative',
        'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
        isUnread && 'bg-blue-50/40 dark:bg-blue-500/[0.06]',
      )}
    >
      {isUnread && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-500" />
      )}

      <span className={cn(
        'shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5',
        meta.bg, meta.darkBg, meta.iconColor,
      )}>
        {meta.icon}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-[13px] leading-snug flex-1',
            isUnread
              ? 'font-semibold text-gray-900 dark:text-white'
              : 'font-medium text-gray-600 dark:text-gray-400',
          )}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />
          )}
        </div>

        <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>

        <div className="flex items-center gap-2 mt-0.5">
          {taskCode && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
              {taskCode}
            </span>
          )}
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: vi,
            })}
          </span>
        </div>
      </div>
    </button>
  );
}
