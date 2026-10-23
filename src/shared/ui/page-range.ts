/** Logic phân trang dùng chung (hàm thuần). Cỡ trang và dải số giống preview tasks-list. */
export const PAGE_SIZES = [10, 20, 50, 100] as const;
export type PageItem = number | '…';

export function pageCount(total: number, size: number): number {
  if (total <= 0 || size <= 0) return 0;
  return Math.ceil(total / size);
}

/** Dải số trang: ≤7 trang hiện hết; nhiều hơn thì luôn có trang đầu, cuối và "…". */
export function pageRange(current: number, total: number): PageItem[] {
  if (total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cur = Math.min(Math.max(1, Math.trunc(current) || 1), total);
  if (cur <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (cur >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', cur - 1, cur, cur + 1, '…', total];
}

/** Khoảng bản ghi của trang hiện tại (1-based) cho dòng "a–b / n". */
export function pageWindow(page: number, size: number, total: number): { from: number; to: number; total: number } {
  if (total <= 0) return { from: 0, to: 0, total: 0 };
  const from = (Math.max(1, page) - 1) * size + 1;
  return { from, to: Math.min(from + size - 1, total), total };
}
