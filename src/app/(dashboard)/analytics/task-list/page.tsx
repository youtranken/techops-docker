'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Search } from 'lucide-react';
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

function TaskListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { exportPdf, isExporting } = useExportPdf();

  const defaultRange = getDefaultRange();
  const range: TLDateRange = {
    preset: (searchParams.get('preset') as TLPreset) ?? 'month',
    dateFrom: searchParams.get('dateFrom') ?? defaultRange.dateFrom,
    dateTo: searchParams.get('dateTo') ?? defaultRange.dateTo,
  };
  const userId = searchParams.get('userId') ?? '';
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Number(searchParams.get('pageSize') ?? 20);
  const [searchInput, setSearchInput] = useState(search);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const { data: employees = [] } = useTaskListEmployees();
  const { data, isLoading } = useTaskList({
    dateFrom: range.dateFrom || undefined,
    dateTo: range.dateTo || undefined,
    userId: userId || undefined,
    search: search || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  function handleRangeChange(v: TLDateRange) {
    updateParams({ dateFrom: v.dateFrom, dateTo: v.dateTo, preset: v.preset, page: '1' });
  }

  function handleEmployeeChange(uid: string) {
    updateParams({ userId: uid, page: '1' });
  }

  function handleSearch() {
    updateParams({ search: searchInput, page: '1' });
  }

  function handleSort(field: string) {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    updateParams({ sortBy: field, sortOrder: newOrder, page: '1' });
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Danh sách công việc</h3>
              {data && (
                <p className="text-sm text-gray-500 mt-0.5">{data.total.toLocaleString('vi-VN')} task trong kỳ</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Tìm theo tên, mã..."
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/30 w-44"
                />
              </div>
              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  updateParams({ sortBy: field, sortOrder: order, page: '1' });
                }}
                className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              >
                <option value="createdAt-desc">Mới nhất</option>
                <option value="createdAt-asc">Cũ nhất</option>
                <option value="scheduleEnd-asc">Deadline tăng</option>
                <option value="scheduleEnd-desc">Deadline giảm</option>
                <option value="title-asc">Tên A→Z</option>
                <option value="title-desc">Tên Z→A</option>
                <option value="status-asc">Trạng thái A→Z</option>
              </select>
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
              onPageChange={(p) => updateParams({ page: String(p) })}
              onPageSizeChange={(s) => updateParams({ pageSize: String(s), page: '1' })}
              showEmployee={!userId}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TaskListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải...</div>}>
      <TaskListContent />
    </Suspense>
  );
}
