'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PendingFilters, FilterOptions } from '@/modules/helpdesk/types';

interface TicketFilterBarProps {
  filters:         PendingFilters;
  options:         FilterOptions | undefined;
  hasActiveFilter: boolean;
  onFilterChange:  (key: keyof Omit<PendingFilters, 'page' | 'limit'>, value: string) => void;
  onClearFilters:  () => void;
}

export function TicketFilterBar({ filters, options, hasActiveFilter, onFilterChange, onClearFilters }: TicketFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm ticket..."
          className="pl-9"
          value={filters.search ?? ''}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>

      <Input
        type="date" value={filters.dateFrom ?? ''}
        onChange={(e) => onFilterChange('dateFrom', e.target.value)}
        className="w-[145px] h-9" title="Từ ngày"
      />
      <Input
        type="date" value={filters.dateTo ?? ''}
        onChange={(e) => onFilterChange('dateTo', e.target.value)}
        className="w-[145px] h-9" title="Đến ngày"
      />

      <Select value={filters.uuTien ?? 'all'} onValueChange={(v) => onFilterChange('uuTien', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ưu tiên" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả ưu tiên</SelectItem>
          {(options?.uuTien ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.trangThai ?? 'all'} onValueChange={(v) => onFilterChange('trangThai', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {(options?.trangThai ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.itSupport ?? 'all'} onValueChange={(v) => onFilterChange('itSupport', v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[170px]"><SelectValue placeholder="IT Support" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả IT Support</SelectItem>
          <SelectItem value="__none__">Chưa có IT</SelectItem>
          {(options?.itSupport ?? []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      {hasActiveFilter && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
