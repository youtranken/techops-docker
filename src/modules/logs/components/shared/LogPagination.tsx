'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LogPagination } from '../../types';

interface Props {
  pagination: LogPagination;
  onPageChange: (page: number) => void;
}

export function LogPagination({ pagination, onPageChange }: Props) {
  const { page, total, totalPages } = pagination;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{total.toLocaleString()}</span> kết quả
        {' · '}Trang <span className="font-medium text-foreground">{page}</span>
        {' / '}{totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
