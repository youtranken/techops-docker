'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Search, Users, Calendar, X, Download } from 'lucide-react';
import { useUsers } from '@/modules/hr/hooks/useUsers';
import { useRoles } from '@/modules/hr/hooks/useRoles';
import { UserTable } from '@/modules/hr/components/UserTable';
import { CreateUserModal } from '@/modules/hr/components/CreateUserModal';
import { EditUserModal } from '@/modules/hr/components/EditUserModal';
import type { UserWithRoleAndTasks } from '@/modules/hr/users/types';
import { useSession } from 'next-auth/react';
import { useMyPermissions } from '@/shared/hooks/useMyPermissions';
import { ROLE_LABELS } from '@/lib/constants';

export default function HRUsersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role?.name === 'ADMIN';
  const isPrivileged = ['ADMIN', 'BOSS'].includes(session?.user?.role?.name ?? '');

  // Feature permissions — privileged users get all features
  const { hasFeature } = useMyPermissions();
  const hrFeatures: string[] = isPrivileged
    ? ['edit', 'deactivate', 'delete', 'change_password']
    : [
        ...(hasFeature('hr', 'edit')       ? ['edit', 'change_password'] : []),
        ...(hasFeature('hr', 'deactivate') ? ['deactivate'] : []),
        ...(hasFeature('hr', 'delete')     ? ['delete'] : []),
      ];

  // Filters
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [isActive, setIsActive] = useState<string>('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoleAndTasks | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);  // Bulk selection (controlled)

  // Data
  const { data: roles = [] } = useRoles();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useUsers({
    search: search || undefined,
    roleId: roleId || undefined,
    isActive: isActive === 'all' ? undefined : isActive === 'active',
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    page,
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
    setSelectedIds([]);
  }

  function handleRoleChange(value: string) {
    setRoleId(value === 'all' ? '' : value);
    setPage(1);
    setSelectedIds([]);
  }

  function handleStatusChange(value: string) {
    setIsActive(value);
    setPage(1);
    setSelectedIds([]);
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản lý nhân viên</h1>
            <p className="text-sm text-muted-foreground">
              {pagination ? (
                <>
                  Tổng cộng{' '}
                  <Badge variant="secondary" className="font-mono">
                    {pagination.total}
                  </Badge>{' '}
                  người dùng
                </>
              ) : (
                'Đang tải...'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPrivileged && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const params = new URLSearchParams();
              if (search) params.set('search', search);
              if (roleId) params.set('roleId', roleId);
              if (isActive !== 'all') params.set('isActive', String(isActive === 'active'));
              if (createdFrom) params.set('createdFrom', createdFrom);
              if (createdTo) params.set('createdTo', createdTo);
              window.open(`/api/hr/users/export?${params.toString()}`, '_blank');
            }}>
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Tạo người dùng
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, username, email..."
            className="pl-9"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <Select value={roleId || 'all'} onValueChange={handleRoleChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lọc theo vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {ROLE_LABELS[role.name] ?? role.name}
                <span className="ml-1 text-muted-foreground text-xs">({role._count.users})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={isActive} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Đã vô hiệu hóa</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input type="date" value={createdFrom} onChange={(e) => { setCreatedFrom(e.target.value); setPage(1); }} className="w-[145px] h-9" title="Từ ngày" />
          <span className="text-muted-foreground">—</span>
          <Input type="date" value={createdTo} onChange={(e) => { setCreatedTo(e.target.value); setPage(1); }} className="w-[145px] h-9" title="Đến ngày" />
          {(createdFrom || createdTo) && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setCreatedFrom(''); setCreatedTo(''); setPage(1); }} title="Xóa lọc ngày">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Lỗi: {error?.message ?? 'Không thể tải danh sách người dùng'}
        </div>
      ) : (
        <UserTable
          users={users}
          hrFeatures={hrFeatures}
          actorIsPrivileged={isPrivileged}
          onEdit={(user) => setEditingUser(user)}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Tiếp
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAdmin && (
        <CreateUserModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        canChangeRole={isPrivileged}
      />
    </div>
  );
}
