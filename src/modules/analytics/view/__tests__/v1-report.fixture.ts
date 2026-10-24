/**
 * BẢN SAO NGUYÊN VĂN logic V1 của Báo cáo (trước A3-5) — "oracle" để test V2 gửi/tính y như V1.
 * Nguồn: app/(dashboard)/analytics/page.tsx (kỳ trước, excelUrl, KPI), components/DateRangeFilter.tsx (getPresetRange),
 * components/TaskListFilter.tsx (buildRange), app/(dashboard)/analytics/task-list/page.tsx (buildPeriodLabel,
 * buildPeriodTitle, excelExportUrl, handleSort, đọc URL), hooks/useAnalytics.ts (useTaskList params, DateFilters params),
 * components/PerformanceTable.tsx (drillDownUrl, completionPct), components/DrillDownModal.tsx (params),
 * app/(dashboard)/analytics/research/page.tsx (lọc quá hạn), hooks/useExportPdf.ts (getPeriodFilename).
 * KHÔNG sửa file này khi đổi V2 — nó mô tả hành vi V1.
 */
import dayjs from 'dayjs';

export interface V1Range { dateFrom: string; dateTo: string }

// DateRangeFilter.getPresetRange
export function v1PresetRange(preset: 'month' | 'quarter' | 'custom'): V1Range {
  const today = dayjs();
  switch (preset) {
    case 'month':
      return {
        dateFrom: today.startOf('month').format('YYYY-MM-DD'),
        dateTo: today.endOf('month').format('YYYY-MM-DD'),
      };
    case 'quarter': {
      const qMonth = Math.floor(today.month() / 3) * 3;
      return {
        dateFrom: today.month(qMonth).startOf('month').format('YYYY-MM-DD'),
        dateTo: today.month(qMonth + 2).endOf('month').format('YYYY-MM-DD'),
      };
    }
    default:
      return { dateFrom: '', dateTo: '' };
  }
}

// analytics/page.tsx prevFilters
export function v1PrevFilters(range: V1Range): V1Range | undefined {
  if (!range.dateFrom || !range.dateTo) return undefined;
  const from = dayjs(range.dateFrom);
  const to = dayjs(range.dateTo);
  const duration = to.diff(from, 'day') + 1;
  return {
    dateFrom: from.subtract(duration, 'day').format('YYYY-MM-DD'),
    dateTo: from.subtract(1, 'day').format('YYYY-MM-DD'),
  };
}

// analytics/page.tsx excelUrl
export function v1ExcelUrl(range: V1Range, preset: string): string {
  const p = new URLSearchParams({ format: 'xlsx' });
  if (range.dateFrom) p.set('dateFrom', range.dateFrom);
  if (range.dateTo) p.set('dateTo', range.dateTo);
  p.set('preset', preset);
  return `/api/analytics/export?${p}`;
}

// useAnalytics: useKpiOverview / useUserPerformance / useTaskTypeTime / useTaskFlowFunnel / useOverdueTasks
export function v1DateParams(filters: { dateFrom?: string; dateTo?: string }): string {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  );
  return params.toString();
}

// analytics/page.tsx — các ô KPI
export interface V1Kpi {
  totalTasksCreated: number; totalCompleted: number; totalOverdue: number; extensionCount: number; extensionRate: number;
  tasksByStatus: Record<string, number>;
}
export function v1KpiValues(kpi: V1Kpi, prevKpi?: V1Kpi) {
  return {
    total: { value: kpi.totalTasksCreated, delta: prevKpi ? kpi.totalTasksCreated - prevKpi.totalTasksCreated : undefined },
    completed: {
      value: kpi.totalCompleted,
      subtitle: `Tỉ lệ: ${kpi.totalTasksCreated > 0 ? (kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1) : '0'}%`,
      progress: kpi.totalTasksCreated > 0 ? parseFloat((kpi.totalCompleted / kpi.totalTasksCreated * 100).toFixed(1)) : 0,
      delta: prevKpi ? kpi.totalCompleted - prevKpi.totalCompleted : undefined,
    },
    inProgress: {
      value: kpi.tasksByStatus['IN_PROGRESS'] ?? 0,
      delta: prevKpi ? (kpi.tasksByStatus['IN_PROGRESS'] ?? 0) - (prevKpi.tasksByStatus['IN_PROGRESS'] ?? 0) : undefined,
    },
    pendingReview: {
      value: (kpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (kpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0),
      delta: prevKpi ? ((kpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (kpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0)) - ((prevKpi.tasksByStatus['PENDING_REVIEW'] ?? 0) + (prevKpi.tasksByStatus['WAITING_ACKNOWLEDGE'] ?? 0)) : undefined,
    },
    overdue: { value: kpi.totalOverdue, color: kpi.totalOverdue > 0 ? 'red' : 'green', delta: prevKpi ? kpi.totalOverdue - prevKpi.totalOverdue : undefined },
    extension: {
      value: kpi.extensionCount,
      subtitle: kpi.extensionRate > 20 ? '⚠️ Vượt ngưỡng 20%' : undefined,
      delta: prevKpi ? kpi.extensionCount - prevKpi.extensionCount : undefined,
    },
  };
}

// DrillDownModal params
export function v1DrillUrl(type: string, dateFrom?: string, dateTo?: string): string {
  const params = new URLSearchParams({ type });
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return `/api/analytics/drilldown?${params}`;
}

// PerformanceTable
export function v1PerfLink(userId: string, dateFrom?: string, dateTo?: string): string {
  const p = new URLSearchParams({ userId });
  if (dateFrom) p.set('dateFrom', dateFrom);
  if (dateTo) p.set('dateTo', dateTo);
  return `/analytics/task-list?${p}`;
}
export function v1CompletionPct(tasksCompleted: number, totalAssigned: number): number {
  return totalAssigned > 0 ? Math.round((tasksCompleted / totalAssigned) * 100) : 0;
}

// TaskListFilter.buildRange
export function v1TlBuildRange(month: number, year: number) {
  if (month === 0) {
    return { preset: 'year', dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }
  const d = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  return { preset: 'month', dateFrom: d.startOf('month').format('YYYY-MM-DD'), dateTo: d.endOf('month').format('YYYY-MM-DD') };
}

// task-list/page.tsx
export interface V1TlRange { dateFrom: string; dateTo: string; preset: 'month' | 'year' | 'custom' }
export function v1BuildPeriodLabel(range: V1TlRange): string {
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
export function v1TlExcelUrl(range: V1TlRange, userId: string): string {
  const p = new URLSearchParams();
  if (range.dateFrom) p.set('dateFrom', range.dateFrom);
  if (range.dateTo) p.set('dateTo', range.dateTo);
  if (userId) p.set('userId', userId);
  p.set('period', v1BuildPeriodLabel(range));
  return `/api/analytics/task-list/export?${p}`;
}
export function v1TlRead(sp: URLSearchParams) {
  const d = dayjs();
  const defaultRange = { dateFrom: d.startOf('month').format('YYYY-MM-DD'), dateTo: d.endOf('month').format('YYYY-MM-DD') };
  return {
    range: {
      preset: (sp.get('preset') as V1TlRange['preset']) ?? 'month',
      dateFrom: sp.get('dateFrom') ?? defaultRange.dateFrom,
      dateTo: sp.get('dateTo') ?? defaultRange.dateTo,
    },
    userId: sp.get('userId') ?? '',
    search: sp.get('search') ?? '',
    sortBy: sp.get('sortBy') ?? 'createdAt',
    sortOrder: (sp.get('sortOrder') as 'asc' | 'desc') ?? 'desc',
    page: Math.max(1, Number(sp.get('page') ?? 1)),
    pageSize: Number(sp.get('pageSize') ?? 20),
  };
}
// useTaskList(filters) với filters như task-list/page.tsx dựng
export function v1TaskListApiUrl(s: ReturnType<typeof v1TlRead>): string {
  const filters = {
    dateFrom: s.range.dateFrom || undefined,
    dateTo: s.range.dateTo || undefined,
    userId: s.userId || undefined,
    search: s.search || undefined,
    sortBy: s.sortBy,
    sortOrder: s.sortOrder,
    page: s.page,
    pageSize: s.pageSize,
  };
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])),
  );
  return `/api/analytics/task-list?${params}`;
}
export function v1NextSort(sortBy: string, sortOrder: string, field: string) {
  const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
  return { sortBy: field, sortOrder: newOrder };
}

// research/page.tsx
export interface V1Overdue { title: string; daysOverdue: number; assignees: { user: { displayName: string } }[] }
export function v1FilterOverdue<T extends V1Overdue>(overdue: T[], search: string, minDays: string): T[] {
  let items = overdue;
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.assignees.some((a) => a.user.displayName.toLowerCase().includes(q)),
    );
  }
  if (minDays && Number(minDays) > 0) {
    items = items.filter((t) => t.daysOverdue >= Number(minDays));
  }
  return items;
}

// useExportPdf.getPeriodFilename
export function v1PdfName(range: V1Range, preset: string): string {
  if (preset === 'month' && range.dateFrom) {
    const d = dayjs(range.dateFrom);
    return `Thang-${d.month() + 1}-${d.year()}`;
  }
  if (preset === 'quarter' && range.dateFrom) {
    const q = Math.floor(dayjs(range.dateFrom).month() / 3) + 1;
    return `Quy-${q}-${dayjs(range.dateFrom).year()}`;
  }
  if (preset === 'year' && range.dateFrom) {
    return `Nam-${dayjs(range.dateFrom).year()}`;
  }
  if (range.dateFrom && range.dateTo) {
    return `${dayjs(range.dateFrom).format('DDMMYYYY')}-${dayjs(range.dateTo).format('DDMMYYYY')}`;
  }
  return 'toan-bo';
}
