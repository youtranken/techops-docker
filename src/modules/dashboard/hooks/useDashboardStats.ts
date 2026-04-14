import { useQuery } from '@tanstack/react-query';
import type { DashboardStats } from '../services/stats.service';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    staleTime: 60_000, // 1 minute client-side cache
    refetchInterval: 120_000, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: true,
  });
}
