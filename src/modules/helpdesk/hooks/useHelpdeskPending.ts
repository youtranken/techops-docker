'use client';

import { useQuery } from '@tanstack/react-query';
import type { HelpdeskPendingItem, PendingFilters, FilterOptions } from '@/modules/helpdesk/types';

// Re-export types for backwards compat during migration (consumers should import from types.ts)
export type { HelpdeskPendingItem, PendingFilters, FilterOptions };

interface PendingListResponse {
  data:  HelpdeskPendingItem[];
  total: number;
  page:  number;
  limit: number;
}

async function fetchPending(filters?: PendingFilters): Promise<PendingListResponse> {
  const params = new URLSearchParams();
  if (filters?.search)    params.set('search',    filters.search);
  if (filters?.uuTien)    params.set('uuTien',    filters.uuTien);
  if (filters?.trangThai) params.set('trangThai', filters.trangThai);
  if (filters?.itSupport) params.set('itSupport', filters.itSupport);
  if (filters?.dateFrom)  params.set('dateFrom',  filters.dateFrom);
  if (filters?.dateTo)    params.set('dateTo',    filters.dateTo);
  if (filters?.page)      params.set('page',      String(filters.page));
  if (filters?.limit)     params.set('limit',     String(filters.limit));
  const res = await fetch(`/api/integrations/helpdesk/unassigned?${params}`);
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
