import { useQuery } from '@tanstack/react-query';
import type { PriorityRef } from '../view-model/dashboard-logic';

/**
 * Danh sách mức ưu tiên (API V1 `GET /api/settings/priorities`, chỉ cần đăng nhập) — để biết `level` của mỗi mức
 * (API tổng quan chỉ trả tên + màu). Cùng queryKey với Cài đặt → dùng chung cache.
 */
export function usePriorityLevels() {
  return useQuery<PriorityRef[]>({
    queryKey: ['priorities'],
    queryFn: async () => {
      const res = await fetch('/api/settings/priorities');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

/** Tên mức → level (tên là duy nhất trong bảng Priority). */
export function useLevelOf() {
  const { data } = usePriorityLevels();
  return (name: string | null | undefined): number | null => {
    if (!name || !data) return null;
    return data.find((p) => p.name === name)?.level ?? null;
  };
}
