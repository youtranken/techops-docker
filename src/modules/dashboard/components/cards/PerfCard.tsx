'use client';

/**
 * Hiệu suất — V1 `GET /api/dashboard/performance?days=7|30` (việc tạo mới / hoàn thành mỗi ngày, mặc định 30 ngày).
 * Vẽ bằng recharts (đã có); đường monotone, không tô nền; bảng ẩn cho trình đọc màn hình.
 */
import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton, ErrorState } from '@/shared/ui/States';
import { useFormat } from '@/i18n/useFormat';
import { usePerformanceTrend } from '../../hooks/usePerformanceTrend';
import { perfSummary, type PerfPoint } from '../../view-model/dashboard-logic';
import { DashCard, CardEmpty } from '../parts/DashCard';

const C_CREATED = 'var(--primary-text)';
const C_DONE = 'var(--c-done)';

function Key({ color }: { color: string }) {
  return <i aria-hidden className="h-[3px] w-3.5 flex-none rounded-sm" style={{ background: color }} />;
}

function Tip({ active, payload, label, dm }: { active?: boolean; payload?: { payload: PerfPoint }[]; label?: string; dm: (d: string) => string }) {
  const t = useTranslations();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="v2-pop whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-2 text-xs text-ink-2 shadow-v2-pop">
      <b className="mb-1 block font-semibold text-ink">{dm(label ?? p.date)}</b>
      <div className="flex items-center gap-[7px] leading-[18px]"><Key color={C_CREATED} />{t('db.perf.created')}<span className="ml-auto pl-3.5 font-mono text-ink">{p.created}</span></div>
      <div className="flex items-center gap-[7px] leading-[18px]"><Key color={C_DONE} />{t('db.perf.done')}<span className="ml-auto pl-3.5 font-mono text-ink">{p.completed}</span></div>
    </div>
  );
}

export function PerfCard() {
  const t = useTranslations();
  const f = useFormat();
  const [days, setDays] = React.useState<7 | 30>(30);
  const { data, isLoading, isError, refetch } = usePerformanceTrend(days);
  const points = data ?? [];
  const s = perfSummary(points);
  // ngày 'YYYY-MM-DD' (V1 nhóm theo ngày UTC) → hiện dd/MM, không đổi múi giờ
  const dm = (d: string) => f.dayMonth(`${d}T12:00:00.000Z`);
  const ticks = Array.from({ length: s.top / s.step + 1 }, (_, i) => i * s.step);

  return (
    <DashCard id="db-perf" className="v2-db-perf" title={t('db.perf.t')} sub={t('db.perf.sub')}
      right={<Segmented ariaLabel={t('db.perf.range')} value={String(days) as '7' | '30'} onChange={(v) => setDays(v === '7' ? 7 : 30)}
        options={[{ value: '7', label: t('db.perf.d7') }, { value: '30', label: t('db.perf.d30') }]} />}>
      <div className="flex flex-wrap gap-x-[18px] gap-y-1 px-4 pt-2.5 text-[13px] text-ink-2 max-[680px]:px-3.5">
        <span className="inline-flex items-center gap-[7px]"><Key color={C_CREATED} />{t('db.perf.created')} <b className="font-mono text-[13px] font-medium text-ink" data-testid="db-perf-created">{isLoading ? '–' : s.created}</b></span>
        <span className="inline-flex items-center gap-[7px]"><Key color={C_DONE} />{t('db.perf.done')} <b className="font-mono text-[13px] font-medium text-ink" data-testid="db-perf-done">{isLoading ? '–' : s.completed}</b></span>
      </div>
      <div className="relative mx-4 mb-3.5 mt-1.5 h-[220px] max-[680px]:mx-3 max-[680px]:h-[200px]" data-testid="db-perf-chart">
        {isLoading ? <Skeleton className="h-full w-full" /> :
         isError ? <ErrorState className="py-6" onRetry={() => refetch()} /> :
         s.empty ? <CardEmpty icon={BarChart3} text={t('db.perf.empty', { n: days })} /> : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="date" tickFormatter={dm} tick={{ fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: 'var(--line-2)' }} tickLine={false} minTickGap={18} interval="preserveEnd" />
                <YAxis ticks={ticks} domain={[0, s.top]} allowDecimals={false} width={26} tick={{ fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: 'var(--line-2)', strokeDasharray: '3 3' }} content={<Tip dm={dm} />} isAnimationActive={false} />
                <Line type="monotone" dataKey="created" stroke={C_CREATED} strokeWidth={2} dot={days === 7 ? { r: 3.5, fill: C_CREATED, stroke: 'var(--surface)', strokeWidth: 2 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="completed" stroke={C_DONE} strokeWidth={2} dot={days === 7 ? { r: 3.5, fill: C_DONE, stroke: 'var(--surface)', strokeWidth: 2 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <table className="sr-only">
              <caption>{`${t('db.perf.t')} · ${t(days === 7 ? 'db.perf.d7' : 'db.perf.d30')}`}</caption>
              <thead><tr><th>{t('db.perf.date')}</th><th>{t('db.perf.created')}</th><th>{t('db.perf.done')}</th></tr></thead>
              <tbody>{points.map((p) => <tr key={p.date}><td>{dm(p.date)}</td><td>{p.created}</td><td>{p.completed}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </div>
    </DashCard>
  );
}
