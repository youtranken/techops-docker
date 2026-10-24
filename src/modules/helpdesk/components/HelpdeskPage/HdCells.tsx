'use client';

/** Ô hiển thị dùng chung của trang Helpdesk: trạng thái Helpdesk (chấm màu + chữ), cờ ưu tiên, nhãn dịch. */
import * as React from 'react';
import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { PRIORITY_TONE_META } from '@/shared/ui/status-meta';
import { hdPriorityKey, hdStatusKey, type HdStatusKey } from './hd-logic';

const STATUS_COLOR: Record<HdStatusKey, string> = {
  done: 'var(--c-done)', progress: 'var(--c-progress)', pending: 'var(--c-review)',
  approved: 'var(--c-approval)', rejected: 'var(--danger)', closed: 'var(--c-draft)',
};

/** Nhãn dịch cho giá trị gốc từ Helpdesk; giá trị lạ hiện nguyên văn */
export function useHdLabels() {
  const t = useTranslations();
  return React.useMemo(() => ({
    status: (raw: string) => { const k = hdStatusKey(raw); return k ? t(`hd.st.${k}`) : raw; },
    priority: (raw: string) => { const k = hdPriorityKey(raw); return k ? t(`pr.${k}`) : raw; },
  }), [t]);
}

export function HdStatus({ raw, strong, className }: { raw: string; strong?: boolean; className?: string }) {
  const l = useHdLabels();
  const k = hdStatusKey(raw);
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 text-[13px] text-ink-2', strong && 'text-sm text-ink', className)} data-hd-status={k ?? 'other'}>
      <span aria-hidden className="size-2 flex-none rounded-full" style={{ background: k ? STATUS_COLOR[k] : 'var(--ink-3)' }} />
      <span className="truncate">{l.status(raw)}</span>
    </span>
  );
}

/** Cờ ưu tiên: chỉ hiện cho Khẩn cấp / Cao (preview). `withLabel` = kèm chữ (ngăn chi tiết). */
export function HdFlag({ raw, withLabel }: { raw: string; withLabel?: boolean }) {
  const l = useHdLabels();
  const k = hdPriorityKey(raw);
  const strong = k === 'urgent' || k === 'high';
  if (!withLabel && !strong) return null;
  const meta = PRIORITY_TONE_META[k ?? 'normal'];
  return (
    <span className="inline-flex flex-none items-center gap-1.5" style={strong ? { color: meta.color } : undefined} title={withLabel ? undefined : l.priority(raw)}>
      {strong && <Flag aria-hidden className="size-[13px]" fill="currentColor" />}
      <span className={cn(withLabel ? 'text-sm text-ink' : 'sr-only')}>{l.priority(raw)}{withLabel ? '' : ', '}</span>
    </span>
  );
}
