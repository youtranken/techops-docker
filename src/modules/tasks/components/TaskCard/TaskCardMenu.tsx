'use client';

import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRightLeft,
  Edit,
  Ban,
  Eye,
  CalendarPlus,
  CalendarClock,
  ArchiveRestore,
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
  onOpenComplete: (taskId: string) => void;
  onOpenTransfer: (taskId: string) => void;
  onOpenRejectTask: (taskId: string) => void;
  onOpenRejectReview: (taskId: string) => void;
  onOpenCancel: (taskId: string) => void;
  onOpenRestore: (taskId: string) => void;
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
  onOpenComplete,
  onOpenTransfer,
  onOpenRejectTask,
  onOpenRejectReview,
  onOpenCancel,
  onOpenRestore,
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

          {/* Bug 4: Boss thấy 1 đơn xin gia hạn XA NHẤT (latest requestedDate). Đơn cũ hơn xem trong tab chi tiết */}
          {permissions.canApproveExtension && (() => {
            const pending = task.extensions.filter((e) => e.status === 'PENDING');
            if (pending.length === 0) return null;
            const latest = pending.reduce((max, e) =>
              new Date(e.requestedDate) > new Date(max.requestedDate) ? e : max,
            );
            return (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onOpenApproveExtension(task.id, latest.id); }}
                className="text-emerald-600"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Duyệt gia hạn ({new Date(latest.requestedDate).toLocaleDateString('vi-VN')})
              </DropdownMenuItem>
            );
          })()}

          {(permissions.canCancel || permissions.canRestore) && <DropdownMenuSeparator />}

          {permissions.canCancel && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenCancel(task.id); }} className="text-red-600">
              <Ban className="mr-2 h-4 w-4" />Hủy công việc
            </DropdownMenuItem>
          )}

          {permissions.canRestore && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenRestore(task.id); }} className="text-emerald-600">
              <ArchiveRestore className="mr-2 h-4 w-4" />Khôi phục
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
