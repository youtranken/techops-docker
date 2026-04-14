'use client';

import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLogUserList } from '../../hooks/useLogUserList';
import type { UserLogFilters } from '../../types';

const ACTION_OPTIONS = [
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'SESSION_TIMEOUT', label: 'Hết phiên' },
  { value: 'LOGIN_FAILED', label: 'Đăng nhập thất bại' },
  { value: 'VIEW_PAGE', label: 'Xem trang' },
  { value: 'EXPORT_DATA', label: 'Xuất dữ liệu' },
  { value: 'CREATE_USER', label: 'Tạo người dùng' },
  { value: 'UPDATE_USER', label: 'Cập nhật người dùng' },
  { value: 'DELETE_USER', label: 'Xoá người dùng' },
  { value: 'RESET_PASSWORD', label: 'Đặt lại mật khẩu' },
  { value: 'CHANGE_SETTINGS', label: 'Đổi cài đặt' },
];

const IP_TYPE_OPTIONS = [
  { value: 'internal', label: '🏢 Nội bộ' },
  { value: 'external', label: '🌐 External' },
];

interface Props {
  filters: UserLogFilters;
  onChange: (patch: Partial<UserLogFilters>) => void;
}

function UserSelect({ filters, onChange }: Props) {
  const { data: users = [] } = useLogUserList();
  return (
    <Select value={filters.userId ?? 'ALL'}
      onValueChange={(v) => onChange({ userId: v === 'ALL' ? undefined : v, page: 1 })}>
      <SelectTrigger className="h-9 w-48 text-sm">
        <SelectValue placeholder="Người dùng..." />
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

export function UserLogFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
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
      <Select value={filters.ipType ?? 'ALL'}
        onValueChange={(v) => onChange({ ipType: v === 'ALL' ? undefined : v, page: 1 })}>
        <SelectTrigger className="h-9 w-40 text-sm">
          <SelectValue placeholder="Loại IP..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả IP</SelectItem>
          {IP_TYPE_OPTIONS.map(({ value, label }) => (
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
