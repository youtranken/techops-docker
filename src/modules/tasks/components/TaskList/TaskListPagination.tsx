'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface PaginationInfo { page: number; totalPages: number; total: number; limit: number }

interface TaskListPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (p: number) => void;
  onLimitChange: (limit: number) => void;
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export function TaskListPagination({ pagination, onPageChange, onLimitChange }: TaskListPaginationProps) {
  const { page, totalPages, total, limit } = pagination;
  const pages = getPageNumbers(page, totalPages);
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-card border border-border rounded-xl shadow-sm flex-wrap gap-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Hiển thị</span>
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-7 w-16 text-xs px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>/ trang</span>
        {total > 0 && (
          <span className="text-slate-400 ml-1">{from}–{to} / {total} công việc</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7"
          disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
          ) : (
            <Button key={p} size="icon" className="h-7 w-7 text-xs"
              variant={p === page ? 'default' : 'outline'}
              onClick={() => onPageChange(p as number)}>
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="icon" className="h-7 w-7"
          disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
