'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * V2 — ★ Quan trọng + "Hoàn thành – chưa xem" (chỉ Boss/Admin).
 */

export const isTrackingRole = (role: string) => role === 'BOSS' || role === 'ADMIN';

const COUNTERS_KEY = ['task-counters'] as const;

async function postJson(url: string, method: 'POST' | 'PATCH', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message ?? 'Thao tác thất bại');
  return json;
}

/** Số đếm sidebar: { important, unseen } */
export function useTaskCounters(enabled: boolean) {
  return useQuery({
    queryKey: COUNTERS_KEY,
    queryFn: async (): Promise<{ important: number; unseen: number }> => {
      const res = await fetch('/api/tasks/counters');
      if (!res.ok) throw new Error('Không tải được số đếm');
      return res.json();
    },
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

function useInvalidateTracking() {
  const qc = useQueryClient();
  return (taskId?: string) => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: COUNTERS_KEY });
    if (taskId) qc.invalidateQueries({ queryKey: ['task', taskId] });
  };
}

export function useToggleImportant() {
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: ({ id, isImportant }: { id: string; isImportant: boolean }) =>
      postJson(`/api/tasks/${id}/important`, 'PATCH', { isImportant }),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

export function useMarkAllSeen() {
  const invalidate = useInvalidateTracking();
  return useMutation({
    mutationFn: () => postJson('/api/tasks/seen-all', 'POST'),
    onSuccess: () => invalidate(),
  });
}

/**
 * Boss/Admin mở task (trang chi tiết hoặc xem nhanh) đang Hoàn thành → ghi "đã xem".
 * Gọi 1 lần cho mỗi taskId.
 */
export function useMarkSeenOnOpen(task: { id: string; status: string } | undefined | null, role: string) {
  const invalidate = useInvalidateTracking();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!task || !isTrackingRole(role) || task.status !== 'COMPLETED') return;
    if (done.current === task.id) return;
    done.current = task.id;
    postJson(`/api/tasks/${task.id}/seen`, 'POST')
      .then(() => invalidate())
      .catch(() => { done.current = null; });
  }, [task, role, invalidate]);
}
