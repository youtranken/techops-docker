'use client';

/** Mảnh dùng chung của Báo cáo: khung thẻ (preview `.card .ch-h`), vòng tròn (`.dn`), thanh ngang (`.bars`), ghi chú. */
import * as React from 'react';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';

export function RCard({ id, title, right, children, className, testId }: {
  id: string; title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; testId?: string;
}) {
  return (
    <section aria-labelledby={id} data-testid={testId} className={cn('relative min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-v2-1', className)}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 pt-3.5">
        <h2 id={id} className="m-0 font-head text-[15px] font-semibold leading-[1.3] text-ink">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="m-0 px-4 pb-3.5 pt-2 text-xs leading-normal text-ink-3">{children}</p>
);

export const Muted = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 py-7 text-center text-[13px] text-ink-3">{children}</div>
);

export const Dot = ({ color, className }: { color: string; className?: string }) => (
  <span aria-hidden className={cn('size-2 flex-none rounded-full', className)} style={{ background: color }} />
);

export interface Seg { key: string; label: React.ReactNode; value: number; color: string; extra?: React.ReactNode }

/** Vòng tròn + chú giải (preview `.dn`). Rê/focus một dòng → tâm vòng hiện số + tỉ lệ của phần đó. */
export function Donut({ segs, unit, ariaLabel, size = 128, showPct = true, testId }: {
  segs: Seg[]; unit: string; ariaLabel: string; size?: number; showPct?: boolean; testId?: string;
}) {
  const f = useFormat();
  const [hi, setHi] = React.useState<number>(-1);
  const D = segs.filter((s) => s.value > 0);
  const tot = D.reduce((s, x) => s + x.value, 0);
  const r = 52, C = 2 * Math.PI * r, gap = D.length > 1 ? 2 : 0;
  let off = 0;
  const pct = (v: number) => (tot ? f.percent(v / tot) : '0%');
  const cur = hi >= 0 ? D[hi] : null;
  return (
    <div className="flex flex-wrap items-center gap-4 p-4" data-testid={testId}>
      <div className="relative mx-auto flex-none" style={{ width: size, height: size }}>
        <svg viewBox="0 0 128 128" width={size} height={size} role="img" aria-label={ariaLabel} className="-rotate-90 overflow-visible">
          {D.map((x, i) => {
            const len = (x.value / tot) * C;
            const el = (
              <circle key={x.key} cx="64" cy="64" r={r} fill="none" stroke={x.color} strokeWidth={hi === i ? 21 : 16}
                strokeDasharray={`${Math.max(0.5, len - gap).toFixed(2)} ${C.toFixed(2)}`} strokeDashoffset={(-off).toFixed(2)}
                className="transition-[stroke-width] motion-reduce:transition-none" onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(-1)} />
            );
            off += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <b className="font-head text-[22px] font-semibold leading-tight text-ink tabular-nums">{f.number(cur ? cur.value : tot)}</b>
          <span className="max-w-[96px] truncate text-xs leading-snug text-ink-3">{cur ? cur.label : unit}</span>
          {cur && showPct && <span className="text-xs text-ink-3">{pct(cur.value)}</span>}
        </div>
      </div>
      <ul className="m-0 grid min-w-0 flex-[1_1_150px] list-none gap-0.5 p-0">
        {D.map((x, i) => (
          <li key={x.key} tabIndex={0} onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(-1)} onFocus={() => setHi(i)} onBlur={() => setHi(-1)}
            className={cn('-mx-1.5 flex min-w-0 items-center gap-2 rounded-md px-1.5 py-[3px] text-[13px] text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-ring', hi === i && 'bg-surface-2 text-ink')}>
            <Dot color={x.color} />
            <span className="min-w-0 truncate">{x.label}{x.extra}</span>
            <span className="ml-auto font-mono text-xs font-medium text-ink">{f.number(x.value)}</span>
            {showPct && <span className="w-11 text-right font-mono text-xs text-ink-3">{pct(x.value)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarRow { key: string; label: React.ReactNode; small?: React.ReactNode; value: React.ReactNode; pct?: React.ReactNode; ratio: number; color: string }

/** Danh sách thanh ngang (preview `.bars`). */
export function Bars({ rows, testId }: { rows: BarRow[]; testId?: string }) {
  return (
    <ul className="m-0 grid list-none gap-3 px-4 pb-1 pt-3.5" data-testid={testId}>
      {rows.map((b) => (
        <li key={b.key} className="min-w-0">
          <div className="mb-[5px] flex min-w-0 items-baseline gap-2 text-[13px] text-ink-2">
            <span className="min-w-0 truncate">{b.label}</span>
            {b.small && <small className="whitespace-nowrap text-xs text-ink-3">{b.small}</small>}
            <span className="ml-auto whitespace-nowrap font-mono text-[13px] font-medium text-ink">{b.value}</span>
            {b.pct !== undefined && <span className="w-10 text-right font-mono text-xs text-ink-3">{b.pct}</span>}
          </div>
          <div aria-hidden className="h-2 overflow-hidden rounded bg-surface-2">
            <i className="block h-full min-w-[2px] rounded" style={{ width: `${Math.min(100, Math.max(0, b.ratio * 100))}%`, background: b.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
