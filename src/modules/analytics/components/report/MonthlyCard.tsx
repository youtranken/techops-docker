'use client';

/**
 * Tổng quan theo tháng (preview `#mChart`): cột Tạo mới / Hoàn thành + đường Đúng hạn % — dữ liệu V1 `GET /api/analytics/monthly-overview?year=`.
 * Màu theo token (sáng/tối). Tháng chưa có việc xong: V1 trả 0% → V2 không chấm điểm (không vẽ 0% giả).
 */
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocale, useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';
import { Skeleton, ErrorState } from '@/shared/ui/States';
import { useFormat } from '@/i18n/useFormat';
import { resolveLocale } from '@/i18n/locale';
import { useMonthlyOverview } from '../../hooks/useAnalytics';
import { pctText } from '../../view/report-logic';
import { RCard, Note } from './parts';
import { selectCls } from './period';

const C = { cr: 'var(--primary)', dn: 'var(--c-done)', ot: 'var(--c-review)' };
const tick = { fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--font-mono)' };

interface Pt { i: number; m: string; created: number; completed: number; cancelled: number; onTime: number | null }

function Key({ c, line }: { c: string; line?: boolean }) {
  return <i aria-hidden className={line ? 'h-[3px] w-3.5 flex-none rounded-sm' : 'size-2.5 flex-none rounded-[3px]'} style={{ background: c }} />;
}

export function MonthlyCard({ year, years, onYear }: { year: number; years: number[]; onYear: (y: number) => void }) {
  const t = useTranslations();
  const f = useFormat();
  const locale = resolveLocale(useLocale());
  const q = useMonthlyOverview(year);
  const short = t('rp.months').split(',');
  const pts: Pt[] = (q.data ?? []).map((d, i) => ({
    i, m: short[i] ?? d.monthLabel, created: d.created, completed: d.completed, cancelled: d.cancelled, onTime: d.completed > 0 ? d.onTimeRate : null,
  }));
  const empty = pts.every((p) => !p.created && !p.completed);
  const opts = years.includes(year) ? years : [year, ...years];

  const Tip = ({ active, payload }: { active?: boolean; payload?: { payload: Pt }[] }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const row = (c: React.ReactNode, l: string, v: string) => (
      <div className="flex items-center gap-1.5 leading-[1.75]">{c}{l}<span className="ml-auto pl-3.5 font-mono text-ink">{v}</span></div>
    );
    return (
      <div className="min-w-[168px] rounded-md border border-line bg-surface px-2.5 py-2 text-xs text-ink-2 shadow-v2-pop">
        <b className="mb-1 block text-[13px] font-semibold text-ink">{t('rpx.lbl.month', { n: p.i + 1, y: year })}</b>
        {row(<Key c={C.cr} />, t('rp.m.created'), f.number(p.created))}
        {row(<Key c={C.dn} />, t('rp.m.done'), f.number(p.completed))}
        {row(<Key c="var(--ink-3)" />, t('rp.m.cancel'), f.number(p.cancelled))}
        {row(<Key c={C.ot} line />, t('rp.m.ontime'), p.onTime === null ? '—' : pctText(p.onTime, locale))}
      </div>
    );
  };

  return (
    <RCard id="rp-mT" title={t('rp.m.title')} className="mb-4" testId="rp-monthly"
      right={
        <>
          <ul className="m-0 flex list-none flex-wrap items-center gap-x-3.5 gap-y-1.5 p-0 text-xs text-ink-2">
            <li className="inline-flex items-center gap-1.5"><Key c={C.cr} />{t('rp.m.created')}</li>
            <li className="inline-flex items-center gap-1.5"><Key c={C.dn} />{t('rp.m.done')}</li>
            <li className="inline-flex items-center gap-1.5"><Key c={C.ot} line />{t('rp.m.ontime')} %</li>
          </ul>
          <label className="sr-only" htmlFor="rp-year">{t('rp.m.year')}</label>
          <select id="rp-year" value={year} onChange={(e) => onYear(Number(e.target.value))}
            className={`${selectCls} ml-auto !min-w-[96px] !flex-none max-[680px]:ml-0`}>
            {opts.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </>
      }>
      <div className="relative h-[260px] px-2 pt-2.5 max-[680px]:h-[220px]" role="group" aria-label={t('rp.m.aria', { y: year })}>
        {q.isLoading ? <Skeleton className="m-2 h-[calc(100%-16px)] w-[calc(100%-16px)]" /> :
         q.isError ? <ErrorState className="py-6" onRetry={() => void q.refetch()} /> :
         empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[13px] text-ink-2">
            <BarChart3 aria-hidden className="mb-2 size-7 stroke-[1.5] text-ink-3" />{t('rp.m.empty', { y: year })}
          </div>
         ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pts} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="m" tick={tick} axisLine={{ stroke: 'var(--line-2)' }} tickLine={false} interval={0} minTickGap={0} />
              <YAxis yAxisId="n" allowDecimals={false} width={32} tick={tick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="p" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={40} tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip />} isAnimationActive={false} />
              <Bar yAxisId="n" dataKey="created" fill={C.cr} radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Bar yAxisId="n" dataKey="completed" fill={C.dn} radius={[2, 2, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Line yAxisId="p" dataKey="onTime" stroke={C.ot} strokeWidth={2} connectNulls dot={{ r: 3, fill: 'var(--surface)', stroke: C.ot, strokeWidth: 2 }} activeDot={{ r: 4 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
         )}
        {!q.isLoading && !q.isError && !empty && (
          <table className="sr-only">
            <caption>{t('rp.m.title')} {year}</caption>
            <thead><tr><th>{t('rp.m.year')}</th><th>{t('rp.m.created')}</th><th>{t('rp.m.done')}</th><th>{t('rp.m.cancel')}</th><th>{t('rp.m.ontime')}</th></tr></thead>
            <tbody>{pts.map((p) => <tr key={p.i}><td>{p.m}</td><td>{p.created}</td><td>{p.completed}</td><td>{p.cancelled}</td><td>{p.onTime === null ? '—' : `${p.onTime}%`}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      <Note>{t('rp.m.note')}</Note>
    </RCard>
  );
}
