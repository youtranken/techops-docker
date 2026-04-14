'use client';

import { TaskActionButtons } from './TaskActionButtons';
import { ConfirmActionModal } from '../modals/ConfirmActionModal';
import { ReasonModal } from '../modals/ReasonModal';
import { RejectReviewModal } from '../modals/RejectReviewModal';
import { CompleteTaskModal } from '../modals/CompleteTaskModal';
import { TransferModal } from '../modals/TransferModal';
import { ReassignModal } from '../modals/ReassignModal';
import { RequestExtensionModal } from '../modals/RequestExtensionModal';
import type { TaskPermissions } from '../../hooks/useTaskPermissions';
import { useTaskActionPanel } from '../../hooks/useTaskActionPanel';

interface TaskActionPanelProps {
  taskId: string;
  permissions: TaskPermissions;
  currentAssigneeIds: string[];
  currentUserId: string;
  scheduleEnd?: Date | string;
  taskAssignees?: {
    id: string;
    status: string;
    user: { id: string; displayName: string };
    reports?: { content: string; attachments: { fileName: string; filePath: string; fileSize: number }[] }[];
  }[];
}

export function TaskActionPanel({
  taskId, permissions, currentAssigneeIds, currentUserId, scheduleEnd, taskAssignees = [],
}: TaskActionPanelProps) {
  const {
    modal, setModal, close,
    acknowledge, complete, approvePlan, rejectPlan,
    approveReview, rejectReview, rejectTask,
    transfer, reassign, deleteTask, cancelTask, requestExtension,
  } = useTaskActionPanel();

  const completedAssignees = taskAssignees
    .filter((a) => a.status === 'COMPLETED')
    .map((a) => {
      const latest = a.reports?.[a.reports.length - 1];
      return {
        assigneeId: a.id,
        displayName: a.user.displayName,
        latestReport: latest ? { content: latest.content, attachments: latest.attachments } : undefined,
      };
    });

  const isPending = {
    acknowledge: acknowledge.isPending, complete: complete.isPending,
    approvePlan: approvePlan.isPending, rejectPlan: rejectPlan.isPending,
    approveReview: approveReview.isPending, rejectReview: rejectReview.isPending,
    rejectTask: rejectTask.isPending, transfer: transfer.isPending,
    reassign: reassign.isPending, deleteTask: deleteTask.isPending,
    cancelTask: cancelTask.isPending, requestExtension: requestExtension.isPending,
  };

  return (
    <>
      <TaskActionButtons permissions={permissions} onModal={setModal} isPending={isPending} />

      {scheduleEnd && (
        <RequestExtensionModal open={modal === 'extension'} onClose={close}
          currentDeadline={scheduleEnd} isLoading={requestExtension.isPending}
          onConfirm={(reason, requestedDate) =>
            requestExtension.mutate({ taskId, reason, requestedDate }, { onSuccess: close })
          }
        />
      )}

      <ConfirmActionModal open={modal === 'acknowledge'} onClose={close} variant="success"
        title="Tiếp nhận công việc" icon="check"
        description="Bạn xác nhận tiếp nhận và thực hiện công việc này?"
        confirmLabel="Tiếp nhận" isLoading={acknowledge.isPending}
        onConfirm={() => acknowledge.mutate(taskId, { onSuccess: close })}
      />

      <CompleteTaskModal open={modal === 'complete'} onClose={close}
        isLoading={complete.isPending}
        onConfirm={(reportContent, files) =>
          complete.mutate({ taskId, reportContent, files }, { onSuccess: close })
        }
      />

      <ConfirmActionModal open={modal === 'approve-plan'} onClose={close} variant="success"
        title="Duyệt công việc" icon="check"
        description="Xác nhận duyệt kế hoạch? Công việc sẽ chuyển sang trạng thái Chờ tiếp nhận."
        confirmLabel="Duyệt" isLoading={approvePlan.isPending}
        onConfirm={() => approvePlan.mutate(taskId, { onSuccess: close })}
      />

      <ReasonModal open={modal === 'reject-plan'} onClose={close} icon="warning"
        title="Từ chối công việc" placeholder="Lý do từ chối..."
        confirmLabel="Từ chối" isDestructive isLoading={rejectPlan.isPending}
        onConfirm={(reason) => rejectPlan.mutate({ taskId, reason }, { onSuccess: close })}
      />

      <ConfirmActionModal open={modal === 'approve-review'} onClose={close} variant="success"
        title="Duyệt KQ hoàn thành" icon="check"
        description="Xác nhận kết quả công việc? Trạng thái sẽ chuyển sang Hoàn thành."
        confirmLabel="Duyệt" isLoading={approveReview.isPending}
        onConfirm={() => approveReview.mutate(taskId, { onSuccess: close })}
      />

      <RejectReviewModal open={modal === 'reject-review'} onClose={close}
        completedAssignees={completedAssignees} isLoading={rejectReview.isPending}
        onConfirm={(entries) => rejectReview.mutate({ taskId, entries }, { onSuccess: close })}
      />

      <ReasonModal open={modal === 'reject-task'} onClose={close} icon="warning"
        title="Từ chối nhận công việc" placeholder="Lý do từ chối..."
        confirmLabel="Từ chối" required isDestructive isLoading={rejectTask.isPending}
        onConfirm={(reason) => rejectTask.mutate({ taskId, reason }, { onSuccess: close })}
      />

      <TransferModal open={modal === 'transfer'} onClose={close}
        currentUserId={currentUserId} currentAssigneeIds={currentAssigneeIds}
        isLoading={transfer.isPending}
        onConfirm={(newAssigneeId, notes) =>
          transfer.mutate({ taskId, newAssigneeId, notes }, { onSuccess: close })
        }
      />

      <ReassignModal open={modal === 'reassign'} onClose={close}
        isLoading={reassign.isPending}
        onConfirm={(newAssigneeIds) =>
          reassign.mutate({ taskId, newAssigneeIds }, { onSuccess: close })
        }
      />

      <ReasonModal open={modal === 'cancel'} onClose={close} icon="warning"
        title="Hủy công việc" placeholder="Lý do hủy..." required
        confirmLabel="Hủy công việc" isDestructive isLoading={cancelTask.isPending}
        onConfirm={(reason) => cancelTask.mutate({ taskId, reason }, { onSuccess: close })}
      />

      <ConfirmActionModal open={modal === 'delete'} onClose={close} variant="destructive"
        title="Xóa công việc" icon="trash"
        description="Công việc sẽ bị xóa (ẩn khỏi danh sách). Hành động này không thể hoàn tác."
        confirmLabel="Xóa" isDestructive isLoading={deleteTask.isPending}
        onConfirm={() => deleteTask.mutate(taskId, { onSuccess: close })}
      />
    </>
  );
}
