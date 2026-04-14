'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, UserX, UserCheck, Trash2, KeyRound, History } from 'lucide-react';
import type { UserWithRoleAndTasks } from '../types';

interface Props {
  user: UserWithRoleAndTasks;
  /** Các feature keys mà actor có quyền: 'edit' | 'deactivate' | 'delete' | 'change_password'. ADMIN/BOSS truyền tất cả. */
  hrFeatures: string[];
  onEdit: (u: UserWithRoleAndTasks) => void;
  onChangePassword: (u: UserWithRoleAndTasks) => void;
  onViewHistory: (u: UserWithRoleAndTasks) => void;
  onDeactivate: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  deactivating: boolean;
  activating: boolean;
  deleting: boolean;
}
export function UserActionsMenu({ user, hrFeatures, onEdit, onChangePassword, onViewHistory, onDeactivate, onActivate, onDelete, deactivating, activating, deleting }: Props) {
  const canEdit       = hrFeatures.includes('edit');
  const canDeactivate = hrFeatures.includes('deactivate');
  const canDelete     = hrFeatures.includes('delete');
  const canChangePass = hrFeatures.includes('change_password');
  const hasAnyManage  = canDeactivate || canDelete || canChangePass;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Tùy chọn</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewHistory(user)}>
          <History className="mr-2 h-4 w-4" />Lịch sử hoạt động
        </DropdownMenuItem>
        {(canEdit || canChangePass || hasAnyManage) && <DropdownMenuSeparator />}
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="mr-2 h-4 w-4" />Chỉnh sửa
          </DropdownMenuItem>
        )}
        {canChangePass && (
          <DropdownMenuItem onClick={() => onChangePassword(user)}>
            <KeyRound className="mr-2 h-4 w-4" />Đổi mật khẩu
          </DropdownMenuItem>
        )}
        {hasAnyManage && <DropdownMenuSeparator />}
        {canDeactivate && user.isActive && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => { e.preventDefault(); onDeactivate(user.id); }}
            disabled={deactivating}
          >
            <UserX className="mr-2 h-4 w-4" />Vô hiệu hóa
          </DropdownMenuItem>
        )}
        {canDeactivate && !user.isActive && (
          <DropdownMenuItem
            className="text-green-600 focus:text-green-600"
            onSelect={(e) => { e.preventDefault(); onActivate(user.id); }}
            disabled={activating}
          >
            <UserCheck className="mr-2 h-4 w-4" />Kích hoạt lại
          </DropdownMenuItem>
        )}
        {canDelete && user.role.name !== 'ADMIN' && !user.hasTasks && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(e) => { e.preventDefault(); onDelete(user.id); }}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />Xóa
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
