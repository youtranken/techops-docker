'use client';

/**
 * Danh sách ô chọn có mô tả (preview `.clist .citem`) + chọn thứ/giờ gửi (preview `.days .time .sum`).
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { controlClass } from '@/shared/ui/Field';
import { DAY_ORDER, HOURS, allWeekdays, minuteOptions, pad2, scheduleDays, toggleDay, toggleWeekdays } from '../../lib/schedule';

export interface CheckItem {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** chữ phụ bên phải (vd "Gửi cho: …") */
  who?: React.ReactNode;
  /** chèn trước tiêu đề (chấm màu, ảnh đại diện) */
  pre?: React.ReactNode;
  disabled?: boolean;
  title_attr?: string;
}

/** Ô "chọn tất cả" có trạng thái lưng chừng */
function AllBox({ checked, indeterminate, disabled, onChange, label }: { checked: boolean; indeterminate: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <label className={cn('flex min-h-7 items-center gap-2.5 font-medium text-ink', !disabled && 'cursor-pointer')}>
      <input ref={ref} type="checkbox" className="size-4 flex-none accent-primary" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function CheckList({ items, selected, onToggle, onAll, allLabel, disabled, dim, testId, className, columns, allOnly }: {
  items: CheckItem[];
  selected: string[];
  onToggle: (v: string) => void;
  /** có = hiện hàng "chọn tất cả" */
  onAll?: (checked: boolean) => void;
  allLabel?: string;
  disabled?: boolean;
  dim?: boolean;
  testId?: string;
  className?: string;
  /** 2 cột (≥681) */
  columns?: 2;
  /** "Chọn tất cả" chỉ để chọn (V1 Nhắc quá hạn): khoá khi đã chọn đủ */
  allOnly?: boolean;
}) {
  const t = useTranslations();
  const on = items.filter((i) => selected.includes(i.value)).length;
  return (
    <div className={cn('overflow-hidden rounded-ctl border border-line', className)} data-testid={testId}>
      {onAll && (
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-3.5 py-2 text-[13px]">
          <AllBox
            checked={items.length > 0 && on === items.length}
            indeterminate={on > 0 && on < items.length}
            disabled={disabled || (allOnly && on === items.length)}
            onChange={onAll}
            label={allLabel ?? t('set.selAll')}
          />
          <span className="ml-auto whitespace-nowrap text-xs text-ink-3">{t('set.nSel', { a: on, b: items.length })}</span>
        </div>
      )}
      <div className={cn(columns === 2 && 'grid grid-cols-2 max-[680px]:grid-cols-1')}>
        {items.map((it, i) => {
          const dis = disabled || it.disabled;
          return (
            <label
              key={it.value}
              title={it.title_attr}
              className={cn(
                'flex items-start gap-3 border-line px-3.5 py-[11px]',
                columns === 2 ? (i % 2 ? 'border-l max-[680px]:border-l-0 max-[680px]:border-t' : '') : i > 0 && 'border-t',
                dis ? 'cursor-default' : 'cursor-pointer hover:bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)]',
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 flex-none accent-primary"
                checked={selected.includes(it.value)}
                disabled={dis}
                onChange={() => onToggle(it.value)}
              />
              <span className={cn('min-w-0 flex-1', (dim || it.disabled) && 'opacity-60')}>
                <b className="flex items-center gap-2 text-sm font-medium text-ink">{it.pre}{it.title}</b>
                {it.description && <span className="mt-px block text-xs text-ink-3">{it.description}</span>}
              </span>
              {it.who && <span className="flex-none whitespace-nowrap pt-0.5 text-xs text-ink-3 max-[680px]:hidden">{it.who}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

const sel = cn(controlClass, 'h-[34px] w-[84px] font-mono max-[680px]:h-10');

/** Thứ trong tuần (chip) + nút T2–T6 — hành vi V1 */
export function DayPicker({ id, label, days, onChange }: { id: string; label: string; days: number[]; onChange: (d: number[]) => void }) {
  const t = useTranslations();
  const all = allWeekdays(days);
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline gap-3">
        <span id={`${id}-l`} className="text-[13px] font-medium text-ink">{label}</span>
        <button type="button" aria-pressed={all} onClick={() => onChange(toggleWeekdays(days))} className="ml-auto rounded px-1.5 py-0.5 text-[13px] font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {t(all ? 'set.wk.off' : 'set.wk.on')}
        </button>
      </div>
      <div role="group" aria-labelledby={`${id}-l`} className="flex flex-wrap gap-1.5 max-[680px]:gap-[5px]">
        {DAY_ORDER.map((d) => {
          const on = days.includes(d);
          return (
            <label key={d} className="relative max-[680px]:flex-1">
              <input type="checkbox" className="peer absolute size-px opacity-0" checked={on} aria-label={t(`set.dl.${d}`)} onChange={() => onChange(toggleDay(days, d))} />
              <span
                aria-hidden
                className={cn(
                  'grid h-[34px] min-w-11 cursor-pointer place-items-center rounded-ctl border px-2 text-[13px] font-medium max-[680px]:min-w-0 max-[680px]:px-0.5',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                  on ? 'border-primary bg-primary-soft text-primary-text' : 'border-line-2 bg-surface text-ink-2 hover:border-ink-3 hover:text-ink',
                )}
              >
                {t(`set.ds.${d}`)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Giờ gửi (giờ VN, UTC+7 như V1) */
export function TimePicker({ id, hour, minute, onChange }: { id: string; hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  const t = useTranslations();
  return (
    <div className="mb-1">
      <span id={`${id}-l`} className="mb-1.5 block text-[13px] font-medium text-ink">{t('set.time')}</span>
      <div role="group" aria-labelledby={`${id}-l`} className="flex items-center gap-2">
        <select className={sel} aria-label={t('set.hour')} value={hour} onChange={(e) => onChange(Number(e.target.value), minute)} data-testid={`${id}-h`}>
          {HOURS.map((h) => <option key={h} value={h}>{pad2(h)}</option>)}
        </select>
        <span aria-hidden>:</span>
        <select className={sel} aria-label={t('set.minute')} value={minute} onChange={(e) => onChange(hour, Number(e.target.value))} data-testid={`${id}-m`}>
          {minuteOptions(minute).map((m) => <option key={m} value={m}>{pad2(m)}</option>)}
        </select>
        <span className="text-xs text-ink-3">{t('set.tz7')}</span>
      </div>
    </div>
  );
}

/** Dòng tóm tắt "Sẽ gửi … lúc …" */
export function ScheduleSummary({ parts, hour, minute }: { parts: string[]; hour: number; minute: number }) {
  const t = useTranslations();
  return (
    <p className="m-0 mt-3.5 flex items-start gap-2 text-[13px] text-ink-2" data-testid="set-sched-sum">
      <CalendarDays aria-hidden className="mt-0.5 size-4 flex-none text-ink-3" />
      <span>
        {parts.length
          ? fillNodes(t.raw('set.sumAt') as string, {
              d: <b className="font-medium text-ink">{parts.join(' · ')}</b>,
              t: <b className="font-mono font-medium text-ink">{pad2(hour)}:{pad2(minute)}</b>,
            })
          : t('set.dg.sumNone')}
      </span>
    </p>
  );
}

/** Chèn phần tử React vào câu có {placeholder} (câu lấy bằng t.raw) */
export function fillNodes(raw: string, nodes: Record<string, React.ReactNode>): React.ReactNode[] {
  return raw.split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return <React.Fragment key={i}>{m && m[1] in nodes ? nodes[m[1]] : part}</React.Fragment>;
  });
}

export function useDayList() {
  const t = useTranslations();
  return (days: number[]) => scheduleDays(days).map((d) => t(`set.ds.${d}`)).join(', ');
}
