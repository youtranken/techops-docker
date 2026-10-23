'use client';

/**
 * Dữ liệu Bảng Kanban (A2-4a): mỗi cột = 1 lần gọi `GET /api/tasks` V1 (cùng `fetchTasks` + khoá ['tasks', filters]
 * như danh sách → mutation V1 invalidate ['tasks'] là cả bảng tải lại). Không thêm endpoint.
 * Mỗi cột tải `COL_LIMIT` thẻ đầu (đã sắp theo lựa chọn Sắp xếp), "Xem thêm" tăng tới 100 (MAX_PAGE_SIZE của API).
 */
import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import type { PaginatedResult } from '@/lib/types/pagination';
import { fetchTasks } from '../../hooks/useTaskList';
import type { TaskListFilters, TaskListItem } from '../../services/task-query.service';
import { boardColumns, columnFilters, nextColLimit, COL_LIMIT, type BoardCol } from './board-logic';

export interface BoardColumnData {
  col: BoardCol;
  /** false = cột không thuộc bộ lọc / tab hiện tại (không tải) */
  inFilter: boolean;
  tasks: TaskListItem[];
  total: number;
  limit: number;
  loading: boolean;
  error: boolean;
}

export function useBoardData(apiFilters: TaskListFilters, tracking: boolean, enabled: boolean) {
  const cols = boardColumns(apiFilters);
  const [limits, setLimits] = React.useState<Partial<Record<BoardCol, number>>>({});
  // Đổi bộ lọc/tab/tìm kiếm → mọi cột về giới hạn đầu
  const key = JSON.stringify({ ...apiFilters, page: undefined, limit: undefined });
  React.useEffect(() => setLimits({}), [key]);

  const plans = cols.map((col) => ({ col, f: columnFilters(apiFilters, col, limits[col] ?? COL_LIMIT, tracking) }));
  const results = useQueries({
    queries: plans.map(({ col, f }) => ({
      queryKey: f ? ['tasks', f] : ['tasks', 'board-off', col],
      queryFn: () => fetchTasks(f!),
      staleTime: 30_000,
      // "Xem thêm" / gõ tìm kiếm: giữ thẻ cũ CỦA CÙNG CỘT trong lúc tải, không nháy khung xương
      placeholderData: (prev: PaginatedResult<TaskListItem> | undefined, q?: { queryKey: readonly unknown[] }) =>
        (q?.queryKey[1] as TaskListFilters | undefined)?.status === col ? prev : undefined,
      enabled: enabled && !!f,
    })),
  });

  const columns: BoardColumnData[] = plans.map(({ col, f }, i) => {
    const r = results[i];
    return {
      col,
      inFilter: !!f,
      tasks: f ? (r.data?.data ?? []) : [],
      total: f ? (r.data?.pagination.total ?? 0) : 0,
      limit: limits[col] ?? COL_LIMIT,
      loading: !!f && r.isLoading,
      error: !!f && r.isError,
    };
  });

  const showMore = React.useCallback((col: BoardCol) => setLimits((l) => ({ ...l, [col]: nextColLimit(l[col] ?? COL_LIMIT) })), []);
  const refetch = () => results.forEach((r) => void r.refetch());

  return {
    columns,
    /** Thứ tự thẻ theo cột (dùng cho ngăn chi tiết ‹ › và hộp thoại) */
    tasks: columns.flatMap((c) => c.tasks),
    total: columns.reduce((n, c) => n + c.total, 0),
    loading: columns.some((c) => c.loading),
    error: columns.some((c) => c.error),
    showMore,
    refetch,
  };
}
