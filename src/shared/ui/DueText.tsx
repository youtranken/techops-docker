'use client';

/** Chữ hạn theo tông (preview `.due-*`). Logic ở `due.ts` (hàm thuần, có test). */
import type { TaskStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import { dueInfo, type DueTone } from './due';

const TONE_CLASS: Record<DueTone, string> = {
  overdue: 'text-due-overdue font-medium',
  soon: 'text-due-soon font-medium',
  near: 'text-due-near',
  calm: 'text-due-calm',
  done: 'text-due-done',
  none: 'text-due-calm',
};

export interface DueTextProps {
  dueDate: Date | string | null | undefined;
  status: TaskStatus | string;
  /** Mốc "bây giờ" (test/SSR); mặc định thời điểm render */
  now?: Date;
  className?: string;
}

export function DueText({ dueDate, status, now, className }: DueTextProps) {
  const info = dueInfo(dueDate, now ?? new Date(), status);
  return (
    <span data-tone={info.tone} className={cn('whitespace-nowrap text-[13px]', TONE_CLASS[info.tone], className)}>
      {info.label}
    </span>
  );
}
