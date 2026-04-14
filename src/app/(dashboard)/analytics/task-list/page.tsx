'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import dayjs from 'dayjs';
import { useTaskList, useTaskListEmployees } from '@/modules/analytics/hooks/useAnalytics';
import { useExportPdf } from '@/modules/analytics/hooks/useExportPdf';
import { TaskListFilter, type TLDateRange, type TLPreset } from '@/modules/analytics/components/TaskListFilter';
import { TaskListKpiCards } from '@/modules/analytics/components/TaskListKpiCards';
import { TaskListTable } from '@/modules/analytics/components/TaskListTable';
import { Button } from '@/components/ui/button';

const CONTENT_ID = 'task-list-content';

function getDefaultRange(): TLDateRange {
  const d = dayjs();
  return {
    preset: 'month',
    dateFrom: d.startOf('month').format('YYYY-MM-DD'),
    dateTo: d.endOf('month').format('YYYY-MM-DD'),
  };
}

function buildPeriodLabel(range: TLDateRange): string {
  if (range.preset === 'month' && range.dateFrom) {
    const d = dayjs(range.dateFrom);
    return `Thang-${d.month() + 1}-${d.year()}`;
  }
  if (range.preset === 'year' && range.dateFrom) {
    return `Nam-${dayjs(range.dateFrom).year()}`;
  }
  if (range.dateFrom && range.dateTo) {
    return `${dayjs(range.dateFrom).format('DDMMYYYY')}-${dayjs(range.dateTo).format('DDMMYYYY')}`;
  }
  return 'tat-ca';
}

function buildPeriodTitle(range: TLDateRange): string {
  if (range.preset === 'month' && range.dateFrom) {
    const d = dayjs(range.dateFrom);
    return `Tháng ${d.month() + 1}/${d.year()}`;
  }
  if (range.preset === 'year' && range.dateFrom) {
    return `Năm ${dayjs(range.dateFrom).year()}`;
  }
  if (range.dateFrom && range.dateTo) {
    return `${dayjs(range.dateFrom).format('DD/MM/YYYY')} – ${dayjs(range.dateTo).format('DD/MM/YYYY')}`;
  }
  return 'Toàn bộ';
}

export default function TaskListPage() {
  const [range, setRange]     = useState<TLDateRange>(getDefaultRange);
  const [userId, setUserId]   = useState<string>('');
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { exportPdf, isExporting } = useExportPdf();

  const { data: employees = [] } = useTaskListEmployees();
  const { data, isLoading } = useTaskList({
    dateFrom: range.dateFrom || undefined,
    dateTo: range.dateTo || undefined,
    userId: userId || undefined,
    page,
    pageSize,
  });

  function handleRangeChange(v: TLDateRange) {
    setRange(v);
    setPage(1);
  }

  function handleEmployeeChange(uid: string) {
    setUserId(uid);
    setPage(1);
  }

  function excelExportUrl() {
    const p = new URLSearchParams();
    if (range.dateFrom) p.set('dateFrom', range.dateFrom);
    if (range.dateTo) p.set('dateTo', range.dateTo);
    if (userId) p.set('userId', userId);
    p.set('period', buildPeriodLabel(range));
    return `/api/analytics/task-list/export?${p}`;
  }

  const periodTitle = buildPeriodTitle(range);
  const selectedEmpName = employees.find((e) => e.id === userId)?.displayName ?? 'Tất cả nhân viên';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Danh Sách Task</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {periodTitle} · {selectedEmpName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskListFilter value={range} onChange={handleRangeChange} />
          <select
            value={userId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 outline-none cursor-pointer min-w-[160px]"
          >
            <option value="">Tất cả nhân viên</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.displayName}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" asChild>
              <a href={excelExportUrl()} download>
                <Download className="w-4 h-4 mr-1.5" />Excel
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isExporting}
              onClick={() => void exportPdf(CONTENT_ID, { dateFrom: range.dateFrom, dateTo: range.dateTo }, range.preset as TLPreset)}
            >
              <Download className="w-4 h-4 mr-1.5" />
              {isExporting ? 'Đang xuất...' : 'PDF'}
            </Button>
          </div>
        </div>
      </div>

      <div id={CONTENT_ID} className="space-y-6 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl">
        {data?.kpi && <TaskListKpiCards kpi={data.kpi} />}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Danh sách công việc</h3>
              {data && (
                <p className="text-sm text-gray-500 mt-0.5">{data.total.toLocaleString('vi-VN')} task trong kỳ</p>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <TaskListTable
              rows={data.rows}
              total={data.total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              showEmployee={!userId}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
