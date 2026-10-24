'use client';

/**
 * Mảnh dùng chung của trang Nhật ký V2 (preview logs.html): dựng câu `Msg`, chấm màu hành động, người, nút chép,
 * tiêu đề nhóm ngày, ô tìm (gửi sau 300 ms), ô chọn, khoảng ngày, dòng đếm.
 */
import * as React from 'react';
import { AlertTriangle, Check, Copy, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useFormat } from '@/i18n/useFormat';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { dayHeading, dayKey, type Msg } from '../../view/log-logic';

/* ---------- Msg → chữ ---------- */
export function useMsg() {
  const t = useTranslations();
  const f = useFormat();
  return React.useCallback(function render(m: Msg | null | undefined): string {
    if (!m) return '—';
    if ('raw' in m) return m.raw;
    if ('date' in m) return f.date(m.date);
    if ('status' in m) return t(`st.${m.status}` as never);
    if ('quote' in m) return `“${m.quote}”`;
    const values: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(m.values ?? {})) values[k] = typeof v === 'object' ? render(v) : v;
    return t(m.key as never, values as never);
  }, [t, f]);
}

/* ---------- Hành động: chấm màu theo nhóm (preview `.g-*`) ---------- */
const GROUP_COLOR: Record<string, string> = {
  create: 'var(--c-draft)', flow: 'var(--c-progress)', done: 'var(--c-done)', ext: 'var(--c-review)', neg: 'var(--danger)',
  session: 'var(--c-pickup)', alert: 'var(--danger)', account: 'var(--c-approval)', system: 'var(--c-draft)', other: 'var(--line-2)',
};
export function ActionMark({ group, label, sub, className }: { group: string; label: string; sub?: React.ReactNode; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 text-sm text-ink', className)}>
      {group === 'alert'
        ? <AlertTriangle aria-hidden className="size-4 flex-none text-danger" />
        : <span aria-hidden className="size-2 flex-none rounded-full" style={{ background: GROUP_COLOR[group] ?? GROUP_COLOR.other }} />}
      <span className="flex min-w-0 flex-col leading-snug">
        <span className="truncate">{label}</span>
        {sub}
      </span>
    </span>
  );
}

export function Person({ name, sub, size = 'sm', className }: { name: string; sub?: React.ReactNode; size?: 'xs' | 'sm'; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 text-sm text-ink', className)}>
      <UserAvatar displayName={name} size={size} className="flex-none" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate">{name}</span>
        {sub}
      </span>
    </span>
  );
}

/** Người lạ (đăng nhập sai với tên không tồn tại — V1 user = null) */
export function UnknownPerson({ tried }: { tried?: string }) {
  const t = useTranslations();
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-surface-2 text-[11px] text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)]">?</span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-danger">{t('lg.unknown')}</span>
        {tried && <small className="truncate font-mono text-[11px] text-ink-3">{t('lg.tried', { u: tried })}</small>}
      </span>
    </span>
  );
}

/* ---------- Chép ---------- */
export function CopyBtn({ value, className }: { value: string; className?: string }) {
  const t = useTranslations();
  const [done, setDone] = React.useState(false);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(t('lg.copied', { x: value }));
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error(t('lg.copyFail'));
    }
  }
  return (
    <button type="button" onClick={copy} onKeyDown={(e) => e.stopPropagation()} aria-label={t('lg.copy', { x: value })} title={t('lg.copy', { x: value })}
      className={cn('grid size-7 flex-none place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:size-9', className)}>
      {done ? <Check aria-hidden className="size-3.5 text-c-done" /> : <Copy aria-hidden className="size-3.5" />}
    </button>
  );
}

/* ---------- Nhóm ngày ---------- */
export function DayHeading({ iso }: { iso: string }) {
  const t = useTranslations();
  const f = useFormat();
  const key = dayKey(iso);
  const kind = dayHeading(key, new Date());
  if (kind === 'date') return <span className="font-mono font-normal text-ink-2">{f.date(iso)}</span>;
  return (
    <>
      <span>{t(kind === 'today' ? 'lg.day.today' : 'lg.day.yday')}</span>
      <span className="font-mono font-normal text-ink-3">{f.dayMonth(iso)}</span>
    </>
  );
}

/* ---------- Điều khiển lọc ---------- */
const ctl = 'h-[34px] rounded-ctl border border-line bg-surface text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11';

export function LogSearch({ value, onChange, placeholder, testId }: { value: string; onChange: (v: string) => void; placeholder: string; testId?: string }) {
  const [text, setText] = React.useState(value);
  const last = React.useRef(value);
  React.useEffect(() => { if (value !== last.current) { last.current = value; setText(value); } }, [value]);
  React.useEffect(() => {
    if (text === last.current) return;
    const h = setTimeout(() => { last.current = text; onChange(text); }, 300);
    return () => clearTimeout(h);
  }, [text, onChange]);
  return (
    <label className="relative flex w-[240px] min-w-0 items-center max-[680px]:col-span-2 max-[680px]:w-auto">
      <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-3" />
      <span className="sr-only">{placeholder}</span>
      <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false}
        data-testid={testId} className={cn(ctl, 'w-full pl-8 pr-2.5 placeholder:text-ink-3')} />
    </label>
  );
}

export function LogSelect({ label, value, onChange, children, testId }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; testId?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} title={label} data-testid={testId}
        className={cn(ctl, 'w-auto max-w-[220px] pl-2.5 pr-7 max-[680px]:w-full max-[680px]:max-w-none')}>
        {children}
      </select>
    </label>
  );
}

/** Khoảng ngày: 2 ô date (giá trị yyyy-mm-dd gửi thẳng API như V1); chỉ chặn chọn ngược bằng min/max của ô. */
export function LogDates({ from, to, onFrom, onTo, fromLabel, toLabel, testId }: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; fromLabel: string; toLabel: string; testId?: string;
}) {
  const t = useTranslations();
  const cls = cn(ctl, 'w-[148px] min-w-0 px-2 max-[680px]:w-auto max-[680px]:flex-1');
  return (
    <span role="group" aria-label={t('lgx.f.dates')} className="flex min-w-0 items-center gap-1.5 max-[680px]:col-span-2" data-testid={testId}>
      <input type="date" value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} aria-label={fromLabel} title={fromLabel} className={cls} />
      <span aria-hidden className="text-ink-3">–</span>
      <input type="date" value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} aria-label={toLabel} title={toLabel} className={cls} />
    </span>
  );
}

export function FilterBar({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="search" aria-label={label}
      className="mb-3 flex flex-wrap items-center gap-2 max-[680px]:grid max-[680px]:grid-cols-2">
      {children}
    </div>
  );
}

export function ClearFilters({ show, onClear }: { show: boolean; onClear: () => void }) {
  const t = useTranslations();
  if (!show) return null;
  return (
    <button type="button" onClick={onClear} data-testid="lg-clear"
      className="h-[34px] justify-self-start rounded-md px-2 text-sm font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11">
      {t('lg.f.clear')}
    </button>
  );
}

export function LogMeta({ children }: { children: React.ReactNode }) {
  return <div aria-live="polite" className="mb-2.5 flex min-h-5 flex-wrap items-center gap-2 text-sm text-ink-3" data-testid="lg-meta">{children}</div>;
}
