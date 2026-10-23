/** Trạng thái = chấm màu + chữ (preview `.stat > .sdot`), không pill nền màu. Nhãn/màu lấy từ status-meta.ts. */
import type { TaskStatus, AssigneeStatus } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { taskStatusMeta, assigneeStatusMeta, metaLabel, type StatusMeta } from './status-meta';

type Props = {
  className?: string;
  /** Chữ 14px màu ink (thanh tóm tắt, lưới kv) */
  strong?: boolean;
  /** Chỉ hiện chấm (chữ thành sr-only) */
  hideLabel?: boolean;
} & (
  | { status: TaskStatus | string; kind?: 'task' }
  | { status: AssigneeStatus | string; kind: 'assignee' }
);

export function StatusDot({ status, kind = 'task', className, strong, hideLabel }: Props) {
  const t = useTranslations();
  const meta: StatusMeta = kind === 'assignee' ? assigneeStatusMeta(status) : taskStatusMeta(status);
  const label = metaLabel(meta, t);
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-2 whitespace-nowrap text-[13px] text-ink-2', strong && 'text-sm text-ink', className)}
      data-status={status}
      title={hideLabel ? label : undefined}
    >
      <span
        aria-hidden
        className="size-2 flex-none rounded-full"
        style={meta.hollow ? { boxShadow: `inset 0 0 0 1.5px ${meta.color}` } : { background: meta.color }}
      />
      <span className={cn(hideLabel && 'sr-only')}>{label}</span>
    </span>
  );
}
