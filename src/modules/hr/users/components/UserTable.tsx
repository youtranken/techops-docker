'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserActionsMenu } from './UserActionsMenu';
import { useSession } from 'next-auth/react';
import { ROLE_LABELS, ROLE_BADGE_VARIANTS } from '@/lib/constants';
import type { UserWithRoleAndTasks } from '../types';
import { useDeactivateUser } from '../hooks/useDeactivateUser';
import { useActivateUser } from '../hooks/useActivateUser';
import { useDeleteUser } from '../hooks/useDeleteUser';
import { useBulkAction } from '../hooks/useBulkAction';
import { useRoles } from '../hooks/useRoles';
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

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
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
  const bulkAction = useBulkAction(() => { onSelectChange([]); setBulkRoleId(''); });
  const { data: roles = [] } = useRoles();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [changePwTarget, setChangePwTarget] = useState<UserWithRoleAndTasks | null>(null);
  const [historyTarget, setHistoryTarget] = useState<UserWithRoleAndTasks | null>(null);
  const [sendingResetLinkId, setSendingResetLinkId] = useState<string | null>(null);
  const [bulkRoleId, setBulkRoleId] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false, title: '', description: '', onConfirm: () => {},
  });

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

  function openConfirm(title: string, description: string, onConfirm: () => void) {
    setConfirmDialog({ open: true, title, description, onConfirm });
  }

  async function handleDeactivate(userId: string) {
    try { await deactivate.mutateAsync(userId); toast.success('Đã vô hiệu hóa người dùng'); }
    catch (err: unknown) { toast.error((err as Error).message ?? 'Không thể vô hiệu hóa người dùng'); }
  }

  async function handleActivate(userId: string) {
    try { await activate.mutateAsync(userId); toast.success('Đã kích hoạt lại người dùng'); }
    catch (err: unknown) { toast.error((err as Error).message ?? 'Không thể kích hoạt người dùng'); }
  }

  async function handleSendResetLink(user: UserWithRoleAndTasks) {
    openConfirm(
      'Gửi link đặt lại mật khẩu',
      `Gửi link reset mật khẩu đến email ${user.email ?? '(chưa có email)'} của ${user.displayName}?`,
      async () => {
        setSendingResetLinkId(user.id);
        try {
          const res = await fetch(`/api/hr/users/${user.id}/send-reset-link`, { method: 'POST' });
          const body = await res.json() as { error?: { message?: string } };
          if (!res.ok) throw new Error(body.error?.message ?? 'Không thể gửi email');
          toast.success('Đã gửi link reset mật khẩu');
        } catch (err: unknown) {
          toast.error((err as Error).message ?? 'Gửi email thất bại');
        } finally {
          setSendingResetLinkId(null);
        }
      },
    );
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
      {/* Confirm Dialog — dùng chung cho mọi action cần xác nhận */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDialog.onConfirm()}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Toolbar — only for ADMIN/BOSS with active selection */}
      {actorIsPrivileged && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/80 mb-2">
          <span className="text-sm font-medium text-foreground">Đã chọn {selectedIds.length} người dùng</span>
          <Button size="sm" variant="outline" disabled={bulkAction.isPending}
            onClick={() => bulkAction.mutate({ action: 'deactivate', userIds: selectedIds })}>
            Vô hiệu hóa
          </Button>
          <Button size="sm" variant="outline" disabled={bulkAction.isPending}
            onClick={() => bulkAction.mutate({ action: 'activate', userIds: selectedIds })}>
            Kích hoạt
          </Button>
          <Button size="sm" variant="outline" disabled={bulkAction.isPending}
            onClick={() => openConfirm(
              'Bắt buộc đổi mật khẩu',
              `Bắt buộc ${selectedIds.length} người dùng đổi mật khẩu lần đăng nhập tiếp theo?`,
              () => bulkAction.mutate({ action: 'forceChangePassword', userIds: selectedIds }),
            )}>
            Bắt buộc đổi MK
          </Button>
          <div className="flex items-center gap-1.5">
            <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Chọn vai trò..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={bulkAction.isPending || !bulkRoleId}
              onClick={() => {
                if (!bulkRoleId) return;
                openConfirm(
                  'Đổi vai trò',
                  `Đổi vai trò cho ${selectedIds.length} người dùng?`,
                  () => bulkAction.mutate({ action: 'changeRole', userIds: selectedIds, roleId: bulkRoleId }),
                );
              }}>
              Đổi vai trò
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { onSelectChange([]); setBulkRoleId(''); }}>Bỏ chọn</Button>
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
                // Chính mình trong HR chỉ được edit thông tin — đổi mật khẩu dùng Settings > Profile
                effectiveFeatures = hrFeatures.filter(f => ['edit'].includes(f));
              } else if (!actorIsPrivileged && targetIsPrivileged) {
                effectiveFeatures = [];
              } else if (!actorIsPrivileged) {
                effectiveFeatures = [];
              } else {
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
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <span>{user.email ?? '—'}</span>
                      {user.email && user.emailVerifiedAt && (
                        <span title="Email đã xác nhận"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /></span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={ROLE_BADGE_VARIANTS[user.role.name] ?? 'outline'}>{ROLE_LABELS[user.role.name] ?? user.role.name}</Badge></TableCell>
                  <TableCell>
                    {user.isActive
                      ? <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950/20">Hoạt động</Badge>
                      : <Badge variant="outline" className="text-gray-400 border-gray-300">Đã vô hiệu hóa</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <UserActionsMenu user={user} hrFeatures={canManage ? effectiveFeatures : []} onEdit={onEdit} onChangePassword={setChangePwTarget} onSendResetLink={handleSendResetLink} onViewHistory={setHistoryTarget} onDeactivate={handleDeactivate} onActivate={handleActivate} onDelete={setDeleteTargetId} deactivating={deactivate.isPending} activating={activate.isPending} deleting={deleteUser.isPending} sendingResetLink={sendingResetLinkId === user.id} />
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
