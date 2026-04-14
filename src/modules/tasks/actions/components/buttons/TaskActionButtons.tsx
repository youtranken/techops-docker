'use client';

/**
 * TaskActionButtons — renders all action buttons based on permissions.
 * Tách từ TaskActionPanel để giữ dưới 100 dòng.
 */

import {
  CheckCircle, XCircle, ThumbsUp, ThumbsDown, RotateCcw,
  ArrowRightLeft, UserPlus, Trash2, ClipboardCheck, Ban, CalendarPlus,
} from 'lucide-react';
import { ActionButton } from './ActionButton';
import type { TaskPermissions } from '../../hooks/useTaskPermissions';
import type { ActionModalType } from '../../hooks/useTaskActionPanel';

interface Props {
  permissions: TaskPermissions;
  onModal: (modal: ActionModalType) => void;
  isPending: Record<string, boolean>;
}

export function TaskActionButtons({ permissions, onModal, isPending }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton label="Tiếp nhận" icon={CheckCircle} variant="success"
        isVisible={permissions.canAcknowledge} isLoading={isPending.acknowledge}
        onClick={() => onModal('acknowledge')} />

      <ActionButton label="Hoàn thành" icon={ClipboardCheck} variant="success"
        isVisible={permissions.canComplete} isLoading={isPending.complete}
        onClick={() => onModal('complete')} />

      <ActionButton label="Duyệt công việc" icon={ThumbsUp} variant="success"
        isVisible={permissions.canApprovePlan} isLoading={isPending.approvePlan}
        onClick={() => onModal('approve-plan')} />

      <ActionButton label="Từ chối công việc" icon={ThumbsDown} variant="destructive"
        isVisible={permissions.canRejectPlan} isLoading={isPending.rejectPlan}
        onClick={() => onModal('reject-plan')} />

      <ActionButton label="Duyệt KQ hoàn thành" icon={ThumbsUp} variant="success"
        isVisible={permissions.canApproveReview} isLoading={isPending.approveReview}
        onClick={() => onModal('approve-review')} />

      <ActionButton label="Yêu cầu làm lại" icon={RotateCcw} variant="destructive"
        isVisible={permissions.canRejectReview} isLoading={isPending.rejectReview}
        onClick={() => onModal('reject-review')} />

      <ActionButton label="Từ chối nhận" icon={XCircle} variant="destructive"
        isVisible={permissions.canRejectTask} isLoading={isPending.rejectTask}
        onClick={() => onModal('reject-task')} />

      <ActionButton label="Chuyển giao" icon={ArrowRightLeft} variant="blue"
        isVisible={permissions.canTransfer} isLoading={isPending.transfer}
        onClick={() => onModal('transfer')} />

      <ActionButton label="Giao lại" icon={UserPlus} variant="success"
        isVisible={permissions.canReassign && permissions.allFailed} isLoading={isPending.reassign}
        onClick={() => onModal('reassign')} />

      <ActionButton label="Hủy công việc" icon={Ban} variant="destructive"
        isVisible={permissions.canCancel} isLoading={isPending.cancelTask}
        onClick={() => onModal('cancel')} />

      <ActionButton label="Xóa" icon={Trash2} variant="destructive"
        isVisible={permissions.canDelete} isLoading={isPending.deleteTask}
        onClick={() => onModal('delete')} />

      <ActionButton label="Xin gia hạn" icon={CalendarPlus} variant="warning"
        isVisible={permissions.canRequestExtension} isLoading={isPending.requestExtension}
        onClick={() => onModal('extension')} />
    </div>
  );
}
