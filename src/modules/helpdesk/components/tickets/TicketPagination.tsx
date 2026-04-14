'use client';

import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface TicketPaginationProps {
  currentPage:      number;
  totalPages:       number;
  totalCount:       number;
  pageSize:         number;
  onPageChange:     (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TicketPagination({ currentPage, totalPages, totalCount, pageSize, onPageChange, onPageSizeChange }: TicketPaginationProps) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <span>
          Trang <span className="font-semibold text-foreground">{currentPage}</span> / {totalPages}
          {' · '}
          <span className="font-semibold text-foreground">{totalCount}</span> ticket
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s} / trang</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Trước
        </Button>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Tiếp
        </Button>
      </div>
    </div>
  );
}
