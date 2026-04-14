'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateFilterProps {
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  onDatePresetChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

export function DateFilter({
  datePreset, dateFrom, dateTo,
  onDatePresetChange, onDateFromChange, onDateToChange,
}: DateFilterProps) {
  return (
    <>
      <Select value={datePreset || 'all'} onValueChange={onDatePresetChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Thời gian" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả thời gian</SelectItem>
          <SelectItem value="today">Hôm nay</SelectItem>
          <SelectItem value="7d">7 ngày</SelectItem>
          <SelectItem value="30d">30 ngày</SelectItem>
          <SelectItem value="overdue">Quá hạn</SelectItem>
        </SelectContent>
      </Select>
      <input
        type="date"
        value={dateFrom}
        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground cursor-pointer"
        title="Từ ngày"
      />
      <input
        type="date"
        value={dateTo}
        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
        onChange={(e) => onDateToChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground cursor-pointer"
        title="Đến ngày"
      />
    </>
  );
}
