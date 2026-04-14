'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogUserList } from '../../hooks/useLogUserList';
import type { TaskRefFilters } from '../../types';

interface Props {
  filters: TaskRefFilters;
  onChange: (patch: Partial<TaskRefFilters>) => void;
}

function CreatorSelect({ filters, onChange }: Props) {
  const { data: users = [] } = useLogUserList();
  return (
    <Select value={filters.creatorId ?? 'ALL'}
      onValueChange={(v) => onChange({ creatorId: v === 'ALL' ? undefined : v, page: 1 })}>
      <SelectTrigger className="h-9 w-48 text-sm">
        <SelectValue placeholder="Người tạo..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Tất cả người dùng</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TaskRefFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Input
        placeholder="Tìm taskCode hoặc tiêu đề..."
        value={filters.search ?? ''}
        onChange={(e) => onChange({ search: e.target.value || undefined, page: 1 })}
        className="h-9 w-56 text-sm"
      />
      <CreatorSelect filters={filters} onChange={onChange} />
      <Input type="date" value={filters.scheduleFrom ?? ''} className="h-9 w-40 text-sm"
        title="Schedule từ ngày"
        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
        onChange={(e) => onChange({ scheduleFrom: e.target.value || undefined, page: 1 })} />
      <Input type="date" value={filters.scheduleTo ?? ''} className="h-9 w-40 text-sm"
        title="Schedule đến ngày"
        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
        onChange={(e) => onChange({ scheduleTo: e.target.value || undefined, page: 1 })} />
    </div>
  );
}
