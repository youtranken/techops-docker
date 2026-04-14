'use client';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLogUserList } from '../../hooks/useLogUserList';
import type { TaskLogFilters } from '../../types';

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'TASK_CREATED', label: 'Tạo task' },
  { value: 'TASK_UPDATED', label: 'Cập nhật task' },
  { value: 'TASK_CANCELLED', label: 'Huỷ task' },
  { value: 'TASK_DELETED', label: 'Xoá task' },
  { value: 'PLAN_APPROVED', label: 'Duyệt công việc' },
  { value: 'PLAN_REJECTED', label: 'Từ chối công việc' },
  { value: 'ACKNOWLEDGED', label: 'Tiếp nhận' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'TRANSFERRED', label: 'Chuyển giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'REVIEW_APPROVED', label: 'Chờ Review' },
  { value: 'REVIEW_REJECTED', label: 'Yêu cầu sửa lại' },
  { value: 'REASSIGNED', label: 'Phân công lại' },
  { value: 'EXTENSION_REQUESTED', label: 'Xin gia hạn' },
  { value: 'EXTENSION_APPROVED', label: 'Duyệt gia hạn' },
  { value: 'EXTENSION_REJECTED', label: 'Từ chối gia hạn' },
  { value: 'EXTENSION_WITHDRAWN', label: 'Rút yêu cầu gia hạn' },
  { value: 'FORCE_MODE_TOGGLED', label: 'Bật/tắt Force Mode' },
  { value: 'COMMENT_ADDED', label: 'Bình luận' },
  { value: 'STATUS_CHANGED', label: 'Đổi trạng thái' },
];

interface Props {
  filters: TaskLogFilters;
  onChange: (patch: Partial<TaskLogFilters>) => void;
}

function UserSelect({ filters, onChange }: Props) {
  const { data: users = [] } = useLogUserList();
  return (
    <Select value={filters.userId ?? 'ALL'}
      onValueChange={(v) => onChange({ userId: v === 'ALL' ? undefined : v, page: 1 })}>
      <SelectTrigger className="h-9 w-48 text-sm">
        <SelectValue placeholder="Người thực hiện..." />
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

export function TaskLogFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Input placeholder="Tên task..." value={filters.taskTitle ?? ''}
        onChange={(e) => onChange({ taskTitle: e.target.value || undefined, page: 1 })}
        className="h-9 w-44 text-sm" />
      <Select value={filters.action ?? 'ALL'}
        onValueChange={(v) => onChange({ action: v === 'ALL' ? undefined : v, page: 1 })}>
        <SelectTrigger className="h-9 w-52 text-sm">
          <SelectValue placeholder="Hành động..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả hành động</SelectItem>
          {ACTION_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <UserSelect filters={filters} onChange={onChange} />
      <Input type="date" value={filters.dateFrom ?? ''} className="h-9 w-40 text-sm"
        onChange={(e) => onChange({ dateFrom: e.target.value || undefined, page: 1 })} />
      <Input type="date" value={filters.dateTo ?? ''} className="h-9 w-40 text-sm"
        onChange={(e) => onChange({ dateTo: e.target.value || undefined, page: 1 })} />
    </div>
  );
}
