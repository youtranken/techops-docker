'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Priority, PriorityCreateInput, PriorityUpdateInput } from '../types';

export type { Priority };

async function fetchPriorities(): Promise<Priority[]> {
  const res = await fetch('/api/settings/priorities');
  if (!res.ok) throw new Error('Không thể tải danh sách ưu tiên');
  return res.json();
}

export function usePriorities() {
  return useQuery({ queryKey: ['priorities'], queryFn: fetchPriorities, staleTime: 5 * 60_000 });
}

export function useCreatePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PriorityCreateInput) => {
      const res = await fetch('/api/settings/priorities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priorities'] }),
  });
}

export function useUpdatePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PriorityUpdateInput }) => {
      const res = await fetch(`/api/settings/priorities/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priorities'] }),
  });
}

export function useDeletePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/priorities/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['priorities'] }),
  });
}
