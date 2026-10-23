/** Icon tròn theo loại thông báo (dùng chung chuông + trang /notifications). Bảng icon/tông giữ như A1-4. */
import {
  ClipboardList, CheckCircle, XCircle, ArrowLeftRight, CalendarClock, Search, PenLine, PartyPopper,
  MessageSquare, AlarmClock, Siren, FileText, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'done' | 'danger' | 'review' | 'approval' | 'pickup' | 'muted';
export const TONE: Record<Tone, string> = {
  primary: 'text-c-progress bg-[color-mix(in_srgb,var(--c-progress)_12%,var(--surface))]',
  done: 'text-c-done bg-[color-mix(in_srgb,var(--c-done)_12%,var(--surface))]',
  danger: 'text-danger bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))]',
  review: 'text-c-review bg-[color-mix(in_srgb,var(--c-review)_12%,var(--surface))]',
  approval: 'text-c-approval bg-[color-mix(in_srgb,var(--c-approval)_12%,var(--surface))]',
  pickup: 'text-c-pickup bg-[color-mix(in_srgb,var(--c-pickup)_12%,var(--surface))]',
  muted: 'text-ink-3 bg-surface-2',
};
type IconCmp = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
export const TYPE_META: Record<string, [IconCmp, Tone]> = {
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

export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const [Icon, tone] = TYPE_META[type] ?? [Bell, 'muted' as Tone];
  return (
    <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-full', TONE[tone], className)}>
      <Icon className="size-4" />
    </span>
  );
}
