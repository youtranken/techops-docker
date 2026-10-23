'use client';

/** Một dòng thông báo (preview `.n-item`, chấm chưa đọc bên phải). Icon theo loại thông báo như V1. */
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import {
  ClipboardList, CheckCircle, XCircle, ArrowLeftRight, CalendarClock, Search, PenLine, PartyPopper,
  MessageSquare, AlarmClock, Siren, FileText, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationWithTask } from '../services/notification.service';

type Tone = 'primary' | 'done' | 'danger' | 'review' | 'approval' | 'pickup' | 'muted';
const TONE: Record<Tone, string> = {
  primary: 'text-c-progress bg-[color-mix(in_srgb,var(--c-progress)_12%,var(--surface))]',
  done: 'text-c-done bg-[color-mix(in_srgb,var(--c-done)_12%,var(--surface))]',
  danger: 'text-danger bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))]',
  review: 'text-c-review bg-[color-mix(in_srgb,var(--c-review)_12%,var(--surface))]',
  approval: 'text-c-approval bg-[color-mix(in_srgb,var(--c-approval)_12%,var(--surface))]',
  pickup: 'text-c-pickup bg-[color-mix(in_srgb,var(--c-pickup)_12%,var(--surface))]',
  muted: 'text-ink-3 bg-surface-2',
};
type IconCmp = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
const TYPE_META: Record<string, [IconCmp, Tone]> = {
  TASK_ASSIGNED: [ClipboardList, 'primary'],
  TASK_APPROVED: [CheckCircle, 'done'],
  TASK_REJECTED: [XCircle, 'danger'],
  TRANSFER_RECEIVED: [ArrowLeftRight, 'approval'],
  EXTENSION_REQUESTED: [CalendarClock, 'review'],
  EXTENSION_APPROVED: [CheckCircle, 'done'],
  EXTENSION_REJECTED: [XCircle, 'danger'],
  REVIEW_REQUIRED: [Search, 'review'],
  REVISION_REQUIRED: [PenLine, 'review'],
  TASK_COMPLETED: [PartyPopper, 'done'],
  COMMENT_ADDED: [MessageSquare, 'pickup'],
  DEADLINE_REMINDER: [AlarmClock, 'danger'],
  ALL_FAILED: [Siren, 'danger'],
  PLAN_APPROVAL_REQUESTED: [FileText, 'approval'],
};

interface NotificationItemProps {
  notification: NotificationWithTask;
  unread: boolean;
  onClick: () => void;
}

export function NotificationItem({ notification, unread, onClick }: NotificationItemProps) {
  const locale = useLocale();
  const [Icon, tone] = TYPE_META[notification.type] ?? [Bell, 'muted' as Tone];
  const taskCode = notification.task?.taskCode;
  const created = new Date(notification.createdAt);

  return (
    <button
      type="button"
      onClick={onClick}
      data-unread={unread || undefined}
      className="relative flex w-full gap-2.5 border-0 bg-transparent px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
    >
      <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-full', TONE[tone])}>
        <Icon className="size-4" />
      </span>
      <span className={cn('min-w-0 flex-1', unread && 'pr-4')}>
        <span className={cn('block text-[13px] leading-snug', unread ? 'font-semibold text-ink' : 'font-medium text-ink-2')}>
          {notification.title}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[1.45] text-ink-2">{notification.message}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-3">
          {taskCode && <span className="font-mono text-ink-2">{taskCode}</span>}
          <time dateTime={created.toISOString()}>
            {formatDistanceToNow(created, { addSuffix: true, locale: locale === 'en' ? enUS : vi })}
          </time>
        </span>
      </span>
      {unread && <span aria-hidden className="absolute right-3.5 top-4 size-2 rounded-full bg-primary-text" />}
    </button>
  );
}
