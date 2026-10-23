'use client';

/**
 * Trạng thái lọc/sắp xếp/phân trang của danh sách công việc, ĐỒNG BỘ URL search params như V1.
 * Dùng chung cho chế độ Danh sách (A2-3) và Bảng Kanban (A2-4) để hai chế độ cùng bộ lọc.
 */
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isTrackingRole } from '../../hooks/useTaskTracking';
import { applyUpdates, readListState, toApiFilters, type ListState, type Updates } from './list-logic';

export function useTaskListState(role: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tracking = isTrackingRole(role);
  const query = searchParams.toString();

  const state: ListState = useMemo(
    () => readListState((k) => new URLSearchParams(query).get(k), tracking),
    [query, tracking],
  );

  const update = useCallback(
    (updates: Updates) => router.replace(`?${applyUpdates(query, updates)}`, { scroll: false }),
    [router, query],
  );

  // "Bây giờ" theo ngày — để khoá query (react-query) không đổi mỗi lần render
  const today = new Date().toISOString().slice(0, 10);
  const apiFilters = useMemo(() => toApiFilters(state, new Date()), [state, today]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, update, apiFilters, tracking };
}
