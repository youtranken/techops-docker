'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserActionsMenu } from './UserActionsMenu';
import { useSession } from 'next-auth/react';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '@/lib/constants';
import type { UserWithRoleAndTasks } from '../types';
import { useDeactivateUser } from '../hooks/useDeactivateUser';
import { useActivateUser } from '../hooks/useActivateUser';
import { useDeleteUser } from '../hooks/useDeleteUser';
import { useBulkAction } from '../hooks/useBulkAction';
import { DeleteUserDialog } from './DeleteUserDialog';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UserHistoryModal } from './UserHistoryModal';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[1][0] + words[words.length - 1][0]).toUpperCase();
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  users: UserWithRoleAndTasks[];
  /** Feature keys actor có: 'edit' | 'deactivate' | 'delete' | 'change_password' */
  hrFeatures: string[];
  /** Actor có phải ADMIN hoặc BOSS không — dùng để chặn EMPLOYEE quản lý user privileged */
  actorIsPrivileged: boolean;
  onEdit: (user: UserWithRoleAndTasks) => void;
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
}

export function UserTable({ users, hrFeatures, actorIsPrivileged, onEdit, selectedIds, onSelectChange }: Props) {
  const { data: session } = useSession();
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const deleteUser = useDeleteUser();
  const bulkAction = useBulkAction(() => onSelectChange([]));
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [changePwTarget, setChangePwTarget] = useState<UserWithRoleAndTasks | null>(null);
  const [historyTarget, setHistoryTarget] = useState<UserWithRoleAndTasks | null>(null);

  const deleteTarget = users.find((u) => u.id === deleteTargetId);

  // Selectable = not self; only for privileged actors
  const selectableIds = actorIsPrivileged
    ? users.filter((u) => u.id !== session?.user?.id).map((u) => u.id)
    : [];
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  const someSelected = selectableIds.some((id) => selectedIds.includes(id)) && !allSelected;

  function toggleSelectAll() {
    onSelectChange(allSelected ? [] : selectableIds);
  }

  function toggleUser(id: string) {
    onSelectChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }
  async function handleDeactivate(userId: string) {
    try { await deactivate.mutateAsync(userId); toast.success('Đã vô hiệu hóa người dùng'); }
    catch (err: unknown) { toast.error((err as Error).message ?? 'Không thể vô hiệu hóa người dùng'); }
  }

  async function handleActivate(userId: string) {
    try { await activate.mutateAsync(userId); toast.success('Đã kích hoạt lại người dùng'); }
    catch (err: unknown) { toast.error((err as Error).message ?? 'Không thể kích hoạt người dùng'); }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try { await deleteUser.mutateAsync(id); toast.success('Đã xóa người dùng thành công'); }
    catch (err: unknown) { toast.error((err as Error).message ?? 'Xóa thất bại'); }
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <ShieldCheck className="w-10 h-10 opacity-30" />
        <p className="text-sm">Không tìm thấy người dùng nào</p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Action Toolbar — only for ADMIN/BOSS with active selection */}
      {actorIsPrivileged && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/80 mb-2">
          <span className="text-sm font-medium text-foreground">Đã chọn {selectedIds.length} người dùng</span>
          <Button size="sm" variant="outline" disabled={bulkAction.isPending}
            onClick={() => bulkAction.mutate({ action: 'deactivate', userIds: selectedIds })}>
            Vô hiệu hóa tất cả
          </Button>
          <Button size="sm" variant="outline" disabled={bulkAction.isPending}
            onClick={() => bulkAction.mutate({ action: 'activate', userIds: selectedIds })}>
            Kích hoạt lại tất cả
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSelectChange([])}>Bỏ chọn</Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {actorIsPrivileged && (
                <TableHead className="w-[48px]">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Chọn tất cả"
                  />
                </TableHead>
              )}
              <TableHead className="w-[48px]"></TableHead>
              <TableHead>Tên hiển thị</TableHead>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-[48px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = session?.user?.id === user.id;
              const targetIsPrivileged = ['ADMIN', 'BOSS'].includes(user.role.name);
              
              // Logic phân quyền:
              // - ADMIN/BOSS: Manage tất cả users khác (không phải mình)
              // - EMPLOYEE: CHỈ được edit/đổi pw/xem lịch sử CHÍNH MÌNH
              let effectiveFeatures: string[];
              if (isSelf) {
                // Chính mình: chỉ được edit, change_password, view history
                effectiveFeatures = hrFeatures.filter(f => ['edit', 'change_password'].includes(f));
              } else if (!actorIsPrivileged && targetIsPrivileged) {
                // EMPLOYEE không được manage ADMIN/BOSS
                effectiveFeatures = [];
              } else if (!actorIsPrivileged) {
                // EMPLOYEE không được manage EMPLOYEE khác
                effectiveFeatures = [];
              } else {
                // ADMIN/BOSS manage user khác
                effectiveFeatures = hrFeatures;
              }
              
              const canManage = effectiveFeatures.length > 0;
              const isSelectable = actorIsPrivileged && !isSelf;
              return (
                <TableRow key={user.id} className={!user.isActive ? 'opacity-50' : ''}>
                  {actorIsPrivileged && (
                    <TableCell>
                      {isSelectable && (
                        <Checkbox
                          checked={selectedIds.includes(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                          aria-label={`Chọn ${user.displayName}`}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell><Avatar className="h-8 w-8"><AvatarImage src={user.profile?.avatarUrl ?? ''} alt={user.displayName} className="object-cover" /><AvatarFallback style={{ backgroundColor: user.profile?.avatarColor ?? '#3B82F6' }} className="text-white text-xs font-semibold">{getInitials(user.displayName)}</AvatarFallback></Avatar></TableCell>
                  <TableCell className="font-medium">{user.displayName}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{user.username}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.email ?? '—'}</TableCell>
                  <TableCell><Badge variant={ROLE_BADGE_VARIANTS[user.role.name] ?? 'outline'}>{ROLE_LABELS[user.role.name] ?? user.role.name}</Badge></TableCell>
                  <TableCell>
                    {user.isActive
                      ? <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">Hoạt động</Badge>
                      : <Badge variant="outline" className="text-gray-400 border-gray-300">Đã vô hiệu hóa</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <UserActionsMenu user={user} hrFeatures={canManage ? effectiveFeatures : []} onEdit={onEdit} onChangePassword={setChangePwTarget} onViewHistory={setHistoryTarget} onDeactivate={handleDeactivate} onActivate={handleActivate} onDelete={setDeleteTargetId} deactivating={deactivate.isPending} activating={activate.isPending} deleting={deleteUser.isPending} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <DeleteUserDialog open={Boolean(deleteTargetId)} displayName={deleteTarget?.displayName} username={deleteTarget?.username} isPending={deleteUser.isPending} onConfirm={handleDeleteConfirmed} onCancel={() => setDeleteTargetId(null)} />
      <ChangePasswordModal userId={changePwTarget?.id ?? null} displayName={changePwTarget?.displayName} onClose={() => setChangePwTarget(null)} />
      <UserHistoryModal userId={historyTarget?.id ?? null} displayName={historyTarget?.displayName} onClose={() => setHistoryTarget(null)} />
    </>
  );
}
