import { useQuery } from '@tanstack/react-query';
import type { DrillDownTask } from '@/app/api/analytics/drilldown/route';
import { drillHref, type DrillType, type Range } from '../view/report-logic';

/** Danh sách sau ô KPI — V1 `GET /api/analytics/drilldown?type=&dateFrom=&dateTo=` (tối đa 100 việc). */
export function useDrillDown(type: DrillType | null, range: Range) {
  return useQuery<{ data: DrillDownTask[]; total: number }>({
    queryKey: ['analytics', 'drilldown', type, range.dateFrom, range.dateTo],
    enabled: type !== null,
    queryFn: async () => {
      const res = await fetch(drillHref(type as DrillType, range));
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const d = await res.json();
      return { data: d.data ?? [], total: d.total ?? 0 };
    },
    staleTime: 0,
  });
}
