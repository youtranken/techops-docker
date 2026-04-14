'use client';

import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRightLeft,
  Edit,
  Trash2,
  Ban,
  Eye,
  CalendarPlus,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskListItem } from '../../services/task-query.service';
import type { TaskPermissions } from '../../actions/hooks/useTaskPermissions';

interface TaskCardMenuProps {
  task: TaskListItem;
  permissions: TaskPermissions;
  onOpenQuickView: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (task: TaskListItem) => void;
  onOpenComplete: (taskId: string) => void;
  onOpenTransfer: (taskId: string) => void;
  onOpenRejectTask: (taskId: string) => void;
  onOpenRejectReview: (taskId: string) => void;
  onOpenCancel: (taskId: string) => void;
  onOpenRejectPlan: (taskId: string) => void;
  onOpenExtension: (taskId: string) => void;
  onOpenApproveExtension: (taskId: string, extId: string) => void;
  onAcknowledge: (e: React.MouseEvent) => void;
  onApprovePlan: (e: React.MouseEvent) => void;
  onApproveReview: (e: React.MouseEvent) => void;
}

export function TaskCardMenu({
  task,
  permissions,
  onOpenQuickView,
  onEdit,
  onDelete,
  onOpenComplete,
  onOpenTransfer,
  onOpenRejectTask,
  onOpenRejectReview,
  onOpenCancel,
  onOpenRejectPlan,
  onOpenExtension,
  onOpenApproveExtension,
  onAcknowledge,
  onApprovePlan,
  onApproveReview,
}: TaskCardMenuProps) {
  return (
    <div onClick={(e) => e.stopPropagation()} className="-mr-2 -mt-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenQuickView(task.id); }}>
            <Eye className="mr-2 h-4 w-4" />Xem chi tiết
          </DropdownMenuItem>

          {permissions.canAcknowledge && (
            <DropdownMenuItem onClick={onAcknowledge} className="text-emerald-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />Tiếp nhận
            </DropdownMenuItem>
          )}

          {permissions.canComplete && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenComplete(task.id); }} className="text-emerald-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />Hoàn thành
            </DropdownMenuItem>
          )}

          {permissions.canApprovePlan && (
            <DropdownMenuItem onClick={onApprovePlan} className="text-emerald-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />Duyệt công việc
            </DropdownMenuItem>
          )}

          {permissions.canRejectPlan && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenRejectPlan(task.id); }} className="text-red-600">
              <XCircle className="mr-2 h-4 w-4" />Từ chối công việc
            </DropdownMenuItem>
          )}

          {permissions.canApproveReview && (
            <DropdownMenuItem onClick={onApproveReview} className="text-emerald-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />Duyệt KQ hoàn thành
            </DropdownMenuItem>
          )}

          {permissions.canRejectReview && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenRejectReview(task.id); }} className="text-red-600">
              <AlertCircle className="mr-2 h-4 w-4" />Yêu cầu làm lại
            </DropdownMenuItem>
          )}

          {permissions.canRejectTask && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenRejectTask(task.id); }} className="text-red-600">
              <Ban className="mr-2 h-4 w-4" />Từ chối nhận
            </DropdownMenuItem>
          )}

          {permissions.canTransfer && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenTransfer(task.id); }} className="text-blue-600">
              <ArrowRightLeft className="mr-2 h-4 w-4" />Chuyển giao
            </DropdownMenuItem>
          )}

          {permissions.canEdit && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task.id); }}>
              <Edit className="mr-2 h-4 w-4" />Chỉnh sửa
            </DropdownMenuItem>
          )}

          {permissions.canRequestExtension && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenExtension(task.id); }} className="text-amber-600">
              <CalendarPlus className="mr-2 h-4 w-4" />Xin gia hạn
            </DropdownMenuItem>
          )}

          {permissions.canApproveExtension && task.extensions.some((e) => e.status === 'PENDING') && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                const pendingExt = task.extensions.find((ex) => ex.status === 'PENDING');
                if (pendingExt) onOpenApproveExtension(task.id, pendingExt.id);
              }}
              className="text-emerald-600"
            >
              <CalendarClock className="mr-2 h-4 w-4" />Duyệt gia hạn
            </DropdownMenuItem>
          )}

          {(permissions.canCancel || permissions.canDelete) && <DropdownMenuSeparator />}

          {permissions.canCancel && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenCancel(task.id); }} className="text-red-600">
              <Ban className="mr-2 h-4 w-4" />Hủy công việc
            </DropdownMenuItem>
          )}

          {permissions.canDelete && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task); }} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />Xóa
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
