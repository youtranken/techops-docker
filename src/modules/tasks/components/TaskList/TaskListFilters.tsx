'use client';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { STATUS_CONFIG } from '../TaskCard/TaskStatusBadge';
import { DateFilter } from './DateFilter';
import type { TaskStatus } from '@prisma/client';

const ALL_STATUSES = (Object.entries(STATUS_CONFIG) as [TaskStatus, { label: string }][]).filter(
  ([s]) => s !== 'DRAFT',
);

interface TaskListFiltersProps {
  search: string;
  status: string;
  /** Khoá ô trạng thái, chỉ hiển thị nhãn (vd mục "Hoàn thành – chưa xem") */
  statusLocked?: string;
  priorityId: string;
  typeId: string;
  source: string;
  priorities: { id: string; name: string }[];
  taskTypes: { id: string; name: string }[];
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  onDatePresetChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

export function TaskListFilters({
  search, status, statusLocked, priorityId, typeId, source,
  datePreset, dateFrom, dateTo,
  priorities, taskTypes,
  onSearchChange, onStatusChange, onPriorityChange, onTypeChange,
  onSourceChange, onDatePresetChange, onDateFromChange, onDateToChange,
}: TaskListFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo tiêu đề..."
          className="pl-9"
          value={search}
          onChange={onSearchChange}
        />
      </div>

      {statusLocked ? (
        <Select value="locked" disabled>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="locked">{statusLocked}</SelectItem></SelectContent>
        </Select>
      ) : (
      <Select value={status || 'active'} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[170px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Chưa hoàn thành</SelectItem>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {ALL_STATUSES.map(([s, { label }]) => (
            <SelectItem key={s} value={s}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      )}

      <Select value={priorityId || 'all'} onValueChange={onPriorityChange}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ưu tiên" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả ưu tiên</SelectItem>
          {priorities.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={typeId || 'all'} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Loại công việc" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          {taskTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={source || 'all'} onValueChange={onSourceChange}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Nguồn" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả nguồn</SelectItem>
          <SelectItem value="techops">TechOps</SelectItem>
          <SelectItem value="helpdesk">Helpdesk</SelectItem>
        </SelectContent>
      </Select>
      <DateFilter
        datePreset={datePreset} dateFrom={dateFrom} dateTo={dateTo}
        onDatePresetChange={onDatePresetChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </div>
  );
}
