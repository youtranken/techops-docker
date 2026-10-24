'use client';

/**
 * Báo cáo · Tổng quan V2 (A3-5) — preview `reports.html`. Nghiệp vụ V1 `/analytics` giữ nguyên:
 * cùng API + tham số (`dateFrom`/`dateTo`, kỳ trước lùi đúng số ngày), cùng URL trang (`dateFrom`, `dateTo`, `preset`, `year`),
 * Xuất Excel (`/api/analytics/export`) + PDF (chụp vùng `#analytics-content` như V1).
 */
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Download, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, EmptyState, Skeleton } from '@/shared/ui/States';
import { useFormat } from '@/i18n/useFormat';
import { resolveLocale } from '@/i18n/locale';
import { useKpiOverview, useUserPerformance, useTaskTypeTime, useTaskFlowFunnel } from '../../hooks/useAnalytics';
import { useExportPdf } from '../../hooks/useExportPdf';
import {
  todayISO, parseOverview, overviewUpdate, overviewDisplayPreset, presetRange, prevRange, inferPeriod, monthRange, quarterRange,
  monthOptions, quarterOptions, yearOptions, excelHref, kpiCards, pctText, type OvPreset, type Range, type KpiKey, type DrillType,
} from '../../view/report-logic';
import { ReportHead } from './ReportHead';
import { PeriodBar, usePeriodLabel } from './period';
import { KpiGrid } from './KpiGrid';
import { MonthlyCard } from './MonthlyCard';
import { PerfTable } from './PerfTable';
import { DistCard, FunnelCard, TypeTimeCard } from './SmallCards';
import { DrillDialog } from './DrillDialog';

const CONTENT_ID = 'analytics-content';

export function OverviewPage({ onOpenTask }: { onOpenTask: (id: string, ids: string[]) => void }) {
  const t = useTranslations();
  const f = useFormat();
  const locale = resolveLocale(useLocale());
  const router = useRouter();
  const sp = useSearchParams();
  const today = React.useMemo(() => todayISO(), []);
  const s = parseOverview(sp, today);
  const range = s.range;
  const shown = overviewDisplayPreset(s);
  const label = usePeriodLabel();

  const go = (u: Parameters<typeof overviewUpdate>[1]) => router.replace(`?${overviewUpdate(new URLSearchParams(sp.toString()), u)}`, { scroll: false });
  const onPreset = (p: OvPreset) => (p === 'custom' ? go({ preset: 'custom' }) : go({ preset: p, range: presetRange(p, today) }));

  const filters = { dateFrom: range.dateFrom || undefined, dateTo: range.dateTo || undefined };
  const prev = prevRange(range);
  const kpi = useKpiOverview(filters);
  const prevKpi = useKpiOverview(prev ?? {});
  const perf = useUserPerformance(filters);
  const types = useTaskTypeTime(filters);
  const funnel = useTaskFlowFunnel(filters);
  const { exportPdf, isExporting } = useExportPdf();
  const [drill, setDrill] = React.useState<{ key: KpiKey; type: DrillType } | null>(null);

  const period = inferPeriod(range);
  const pLabel = label(period);
  const k = kpi.data;

  const per = period.kind === 'month' || period.kind === 'quarter' ? period : null;
  const picker = shown === 'month'
    ? { value: per?.kind === 'month' ? `${per.y}-${per.m}` : '', options: monthOptions(today).map((o) => ({ value: `${o.y}-${o.m}`, label: label({ kind: 'month', ...o }) })),
        onChange: (v: string) => { const [y, m] = v.split('-').map(Number); go({ preset: 'month', range: monthRange(y, m) }); } }
    : { value: per?.kind === 'quarter' ? `${per.y}-${per.q}` : '', options: quarterOptions(today).map((o) => ({ value: `${o.y}-${o.q}`, label: label({ kind: 'quarter', ...o }) })),
        onChange: (v: string) => { const [y, q] = v.split('-').map(Number); go({ preset: 'quarter', range: quarterRange(y, q) }); } };

  const aside = k && k.totalTasksCreated > 0
    ? t('rp.sum', { a: pctText(k.onTimeRate, locale), b: t('rp.days', { n: f.number(k.avgCompletionTimeDays) }) })
    : undefined;

  const busy = kpi.isLoading;
  const actions = (
    <>
      <Button variant="outline" size="md" asChild className="max-[680px]:h-11">
        <a href={excelHref(range, shown)} download data-testid="rp-xlsx"><Download aria-hidden />{t('rp.exportXlsx')}</a>
      </Button>
      <Button size="md" disabled={isExporting || busy} aria-busy={isExporting || undefined} className="max-[680px]:h-11" data-testid="rp-pdf"
        onClick={() => void exportPdf(CONTENT_ID, range, shown)}>
        {isExporting ? <><Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />{t('rp.exporting')}</> : <><Download aria-hidden />{t('rp.exportPdf')}</>}
      </Button>
    </>
  );

  return (
    <div>
      <ReportHead sub={prev ? t('rp.sub', { p: pLabel, q: label(inferPeriod(prev)) }) : pLabel} actions={actions} />
      <PeriodBar<OvPreset>
        presets={[{ value: 'month', label: t('rp.pr.month') }, { value: 'quarter', label: t('rp.pr.quarter') }, { value: 'custom', label: t('rp.pr.custom') }]}
        preset={shown} onPreset={onPreset} customValue="custom" picker={picker}
        range={range} onRange={(r: Range) => go({ preset: 'custom', range: r })} aside={aside} today={today}
      />

      <div id={CONTENT_ID}>
        {kpi.isLoading ? <OverviewSkeleton /> :
         kpi.isError ? <div className="rounded-card border border-line bg-surface"><ErrorState title={t('rp.err.t')} description={t('rp.err.d')} onRetry={() => void kpi.refetch()} /></div> :
         k && k.totalTasksCreated === 0 ? (
          <>
            <div className="mb-4 rounded-card border border-line bg-surface shadow-v2-1" data-testid="rp-empty">
              <EmptyState icon={Inbox} title={t('rp.empty.t')} description={t('rp.empty.d')} />
            </div>
            <MonthlyCard year={s.year} years={yearOptions(today)} onYear={(y) => go({ year: y })} />
          </>
         ) : k ? (
          <>
            <KpiGrid cards={kpiCards(k, prevKpi.data)} onDrill={(c) => c.drill && setDrill({ key: c.key, type: c.drill })} />
            <MonthlyCard year={s.year} years={yearOptions(today)} onYear={(y) => go({ year: y })} />
            <PerfTable rows={perf.data ?? []} loading={perf.isLoading} error={perf.isError} onRetry={() => void perf.refetch()} range={range} />
            <div className="grid grid-cols-3 items-start gap-4 max-[1199px]:grid-cols-2 max-[1199px]:[&>:last-child]:col-span-2 max-[680px]:grid-cols-1 max-[680px]:[&>:last-child]:col-span-1">
              <DistCard kpi={k} />
              <FunnelCard data={funnel.data ?? []} loading={funnel.isLoading} />
              <TypeTimeCard data={types.data ?? []} loading={types.isLoading} />
            </div>
          </>
         ) : null}
      </div>

      <DrillDialog open={drill} onClose={() => setDrill(null)} range={range} periodLabel={pLabel}
        onOpenTask={(id, ids) => { setDrill(null); onOpenTask(id, ids); }} />
    </div>
  );
}

function OverviewSkeleton() {
  const t = useTranslations();
  return (
    <div aria-busy="true">
      <span className="sr-only">{t('app.loading')}</span>
      <div className="mb-4 grid grid-cols-6 gap-3 max-[1199px]:grid-cols-3 max-[680px]:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid min-h-[116px] gap-2.5 rounded-card border border-line bg-surface p-4">
            <Skeleton variant="line" style={{ width: '64%' }} /><Skeleton variant="line" style={{ width: '48%', height: 26 }} /><Skeleton variant="line" style={{ width: '80%' }} />
          </div>
        ))}
      </div>
      <div className="mb-4 h-[300px] rounded-card border border-line bg-surface p-4"><Skeleton className="h-full w-full" /></div>
    </div>
  );
}
