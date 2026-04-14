'use client';

import { useState } from 'react';
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

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>(getDefaultRange);
  const [preset, setPreset] = useState<Preset>('month');
  const [year, setYear] = useState(CURRENT_YEAR);
  const { exportPdf, isExporting } = useExportPdf();

  const filters = {
    dateFrom: range.dateFrom || undefined,
    dateTo: range.dateTo || undefined,
  };

  const { data: kpi, isLoading: kpiLoading } = useKpiOverview(filters);
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
            <KpiCard title="Tổng Công Việc" value={kpi.totalTasksCreated} icon={FileText} color="blue" />
            <KpiCard title="Hoàn Thành" value={kpi.totalCompleted} icon={CheckCircle} color="green" subtitle={`Tỉ lệ: ${kpi.totalTasksCreated > 0 ? (kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1) : '0'}%`} progress={kpi.totalTasksCreated > 0 ? parseFloat((kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1)) : 0} />
            <KpiCard title="Đang Thực Hiện" value={kpi.tasksByStatus['IN_PROGRESS'] ?? 0} icon={Clock} color="orange" />
            <KpiCard title="Chờ Review" value={(kpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (kpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0)} icon={Hourglass} color="purple" />
            <KpiCard title="Quá Hạn" value={kpi.totalOverdue} icon={AlertCircle} color={kpi.totalOverdue > 0 ? 'red' : 'green'} />
            <KpiCard title="Gia Hạn" value={kpi.extensionCount} icon={ShieldCheck} color="orange" subtitle={kpi.extensionRate > 20 ? '⚠️ Vượt ngưỡng 20%' : undefined} />
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
          <PerformanceTable data={performance} />
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
    </div>
  );
}
