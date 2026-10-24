'use client';

import { useQuery } from '@tanstack/react-query';
import type { HelpdeskPendingItem, PendingFilters, FilterOptions } from '@/modules/helpdesk/types';
import { pendingUrl } from '../components/HelpdeskPage/hd-logic';

// Re-export types for backwards compat during migration (consumers should import from types.ts)
export type { HelpdeskPendingItem, PendingFilters, FilterOptions };

interface PendingListResponse {
  data:  HelpdeskPendingItem[];
  total: number;
  page:  number;
  limit: number;
}

async function fetchPending(filters?: PendingFilters): Promise<PendingListResponse> {
  const res = await fetch(pendingUrl(filters));
  if (!res.ok) throw new Error('Khong the tai danh sach ticket');
  return res.json() as Promise<PendingListResponse>;
}

async function fetchFilterOptions(): Promise<FilterOptions> {
  const res = await fetch('/api/integrations/helpdesk/unassigned?options=1');
  if (!res.ok) throw new Error('Khong the tai options');
  return res.json() as Promise<FilterOptions>;
}

export function useHelpdeskPending(filters?: PendingFilters) {
  return useQuery({
    queryKey: ['helpdesk-pending', filters],
    queryFn:  () => fetchPending(filters),
    staleTime: 30_000,
  });
}

export function useHelpdeskFilterOptions() {
  return useQuery({
    queryKey: ['helpdesk-filter-options'],
    queryFn:  fetchFilterOptions,
    staleTime: 60_000,
  });
}
