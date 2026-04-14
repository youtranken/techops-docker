import { useQuery } from '@tanstack/react-query';
import type { PerformancePoint } from '../services/performance.service';

async function fetchTrend(days: 7 | 30): Promise<PerformancePoint[]> {
  const res = await fetch(`/api/dashboard/performance?days=${days}`);
  if (!res.ok) throw new Error('Không thể tải dữ liệu hiệu suất');
  return res.json();
}

export function usePerformanceTrend(days: 7 | 30 = 30) {
  return useQuery<PerformancePoint[]>({
    queryKey: ['dashboard', 'performance', days],
    queryFn: () => fetchTrend(days),
    staleTime: 120_000,
  });
}
