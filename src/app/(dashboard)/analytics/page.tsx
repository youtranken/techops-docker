'use client';

import { useCallback, useMemo, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText, CheckCircle, Clock, Hourglass,
  AlertCircle, ShieldCheck,
  Download,
} from 'lucide-react';
import {
  useKpiOverview, useUserPerformance,
  useMonthlyOverview,
  useTaskTypeTime, useTaskFlowFunnel,
} from '@/modules/analytics/hooks/useAnalytics';
import { useExportPdf } from '@/modules/analytics/hooks/useExportPdf';
import { KpiCard } from '@/modules/analytics/components/KpiCard';
import { PerformanceTable } from '@/modules/analytics/components/PerformanceTable';
import { FlowDonutChart } from '@/modules/analytics/components/FlowDonutChart';
import { MonthlyOverviewChart } from '@/modules/analytics/components/MonthlyOverviewChart';
import { TaskTypeTimeChart } from '@/modules/analytics/components/TaskTypeTimeChart';
import { FunnelChart } from '@/modules/analytics/components/FunnelChart';
import { DateRangeFilter, type DateRange, type Preset } from '@/modules/analytics/components/DateRangeFilter';
import { DrillDownModal } from '@/modules/analytics/components/DrillDownModal';
import type { DrillDownType } from '@/app/api/analytics/drilldown/route';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';

const CURRENT_YEAR = new Date().getFullYear();
// Tạo mảng năm từ 2025 đến năm hiện tại
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2024 },
  (_, i) => 2025 + i,
);

function getDefaultRange(): DateRange {
  return {
    dateFrom: dayjs().startOf('month').format('YYYY-MM-DD'),
    dateTo: dayjs().endOf('month').format('YYYY-MM-DD'),
  };
}

const CONTENT_ID = 'analytics-content';

function AnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read filter state from URL, fallback to defaults
  const defaultRange = getDefaultRange();
  const range: DateRange = {
    dateFrom: searchParams.get('dateFrom') ?? defaultRange.dateFrom,
    dateTo: searchParams.get('dateTo') ?? defaultRange.dateTo,
  };
  const preset = (searchParams.get('preset') as Preset) ?? 'month';
  const year = Number(searchParams.get('year') ?? CURRENT_YEAR);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, v));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  function setRange(r: DateRange) {
    updateParams({ dateFrom: r.dateFrom, dateTo: r.dateTo });
  }
  function setPreset(p: Preset) {
    updateParams({ preset: p });
  }
  function setYear(y: number) {
    updateParams({ year: String(y) });
  }
  const { exportPdf, isExporting } = useExportPdf();

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{ type: DrillDownType; title: string } | null>(null);
  function openDrillDown(type: DrillDownType, title: string) { setDrillDown({ type, title }); }

  const filters = {
    dateFrom: range.dateFrom || undefined,
    dateTo: range.dateTo || undefined,
  };

  // Compute previous period (same duration, shifted back)
  const prevFilters = useMemo(() => {
    if (!range.dateFrom || !range.dateTo) return undefined;
    const from = dayjs(range.dateFrom);
    const to = dayjs(range.dateTo);
    const duration = to.diff(from, 'day') + 1;
    return {
      dateFrom: from.subtract(duration, 'day').format('YYYY-MM-DD'),
      dateTo: from.subtract(1, 'day').format('YYYY-MM-DD'),
    };
  }, [range.dateFrom, range.dateTo]);

  const { data: kpi, isLoading: kpiLoading } = useKpiOverview(filters);
  const { data: prevKpi } = useKpiOverview(prevFilters ?? {});
  const { data: performance = [] } = useUserPerformance(filters);
  const { data: monthly = [] } = useMonthlyOverview(year);
  const { data: taskTypes = [] } = useTaskTypeTime(filters);
  const { data: funnel = [] } = useTaskFlowFunnel(filters);

  function excelUrl() {
    const p = new URLSearchParams({ format: 'xlsx' });
    if (range.dateFrom) p.set('dateFrom', range.dateFrom);
    if (range.dateTo) p.set('dateTo', range.dateTo);
    p.set('preset', preset);
    return `/api/analytics/export?${p}`;
  }

  return (
    <div className="space-y-6">
      {/* Header — outside capture area */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Phân tích hiệu suất và xu hướng</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} onPresetChange={setPreset} />
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" asChild>
              <a href={excelUrl()} download>
                <Download className="w-4 h-4 mr-1.5" />Excel
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isExporting}
              onClick={() => void exportPdf(CONTENT_ID, range, preset)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              {isExporting ? 'Đang xuất...' : 'PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Capture area ── */}
      <div id={CONTENT_ID} className="space-y-6 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl">

        {/* KPI Cards */}
        {kpiLoading ? (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[72px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : kpi ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard title="Tổng Công Việc" value={kpi.totalTasksCreated} icon={FileText} color="blue"
              delta={prevKpi ? kpi.totalTasksCreated - prevKpi.totalTasksCreated : undefined}
              onClick={() => openDrillDown('total', 'Tổng Công Việc')} />
            <KpiCard title="Hoàn Thành" value={kpi.totalCompleted} icon={CheckCircle} color="green"
              subtitle={`Tỉ lệ: ${kpi.totalTasksCreated > 0 ? (kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1) : '0'}%`}
              progress={kpi.totalTasksCreated > 0 ? parseFloat((kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1)) : 0}
              delta={prevKpi ? kpi.totalCompleted - prevKpi.totalCompleted : undefined}
              onClick={() => openDrillDown('completed', 'Công Việc Hoàn Thành')} />
            <KpiCard title="Đang Thực Hiện" value={kpi.tasksByStatus['IN_PROGRESS'] ?? 0} icon={Clock} color="orange"
              delta={prevKpi ? (kpi.tasksByStatus['IN_PROGRESS'] ?? 0) - (prevKpi.tasksByStatus['IN_PROGRESS'] ?? 0) : undefined}
              onClick={() => openDrillDown('in_progress', 'Đang Thực Hiện')} />
            <KpiCard title="Chờ Review" value={(kpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (kpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0)} icon={Hourglass} color="purple"
              delta={prevKpi ? ((kpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (kpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0)) - ((prevKpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (prevKpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0)) : undefined}
              onClick={() => openDrillDown('pending_review', 'Chờ Review / Xác Nhận')} />
            <KpiCard title="Quá Hạn" value={kpi.totalOverdue} icon={AlertCircle} color={kpi.totalOverdue > 0 ? 'red' : 'green'}
              delta={prevKpi ? kpi.totalOverdue - prevKpi.totalOverdue : undefined}
              onClick={() => openDrillDown('overdue', 'Công Việc Quá Hạn')} />
            <KpiCard title="Gia Hạn" value={kpi.extensionCount} icon={ShieldCheck} color="orange"
              subtitle={kpi.extensionRate > 20 ? '⚠️ Vượt ngưỡng 20%' : undefined}
              delta={prevKpi ? kpi.extensionCount - prevKpi.extensionCount : undefined} />
          </div>
        ) : null}

        {/* Monthly Year Overview */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Tổng Quan Theo Tháng</h3>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <MonthlyOverviewChart data={monthly} />
        </div>

        {/* Performance — full row */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Hiệu Suất Nhân Viên</h3>
          <PerformanceTable data={performance} dateFrom={range.dateFrom} dateTo={range.dateTo} />
        </div>

        {/* Task Type Time + Funnel + Flow — 3 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Thời gian hoàn tất TB loại công việc</h3>
            <TaskTypeTimeChart data={taskTypes} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Funnel Xử Lý Công Việc</h3>
            <FunnelChart data={funnel} />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Biểu đồ Flow</h3>
            {kpi && <FlowDonutChart data={kpi.tasksByWorkflowMode} />}
          </div>
        </div>

      </div>

      {/* Drill-down modal */}
      <DrillDownModal
        open={drillDown !== null}
        onClose={() => setDrillDown(null)}
        type={drillDown?.type ?? 'total'}
        title={drillDown?.title ?? ''}
        dateFrom={range.dateFrom}
        dateTo={range.dateTo}
      />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
