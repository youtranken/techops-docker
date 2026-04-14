'use client';

import { CreateTaskSheet } from '../CreateTask/CreateTaskSheet';
import { EditTaskModal } from '../TaskModals/EditTaskModal';
import { CompleteTaskModal } from '../../actions/components/modals/CompleteTaskModal';
import { TransferModal } from '../../actions/components/modals/TransferModal';
import { ReasonModal } from '../../actions/components/modals/ReasonModal';
import { RejectReviewModal } from '../../actions/components/modals/RejectReviewModal';
import { RequestExtensionModal } from '../../actions/components/modals/RequestExtensionModal';
import { ApproveExtensionModal } from '../../actions/components/modals/ApproveExtensionModal';
import { TaskQuickViewSheet } from '../TaskQuickView/TaskQuickViewSheet';
import type { TaskListItem } from '../../services/task-query.service';
import { useCompleteTask } from '../../actions/hooks/useCompleteTask';
import { useTransferTask } from '../../actions/hooks/useTransferTask';
import { useRejectTask } from '../../actions/hooks/useRejectTask';
import { useRejectReview } from '../../actions/hooks/useRejectReview';
import { useRejectPlan } from '../../actions/hooks/useRejectPlan';
import { useCancelTask } from '../../actions/hooks/useCancelTask';
import { useRequestExtension, useApproveExtension, useRejectExtension } from '../../actions/hooks/useExtensions';

interface TaskListModalsProps {
  tasks: TaskListItem[];
  currentUserId: string;
  role: string;
  showCreate: boolean;
  editingTask: string | null;
  quickViewTaskId: string | null;
  completeTaskId: string | null;
  transferTaskId: string | null;
  rejectTaskId: string | null;
  rejectReviewId: string | null;
  cancelTaskId: string | null;
  rejectPlanTaskId: string | null;
  extensionTaskId: string | null;
  approveExtState: { taskId: string; extId: string } | null;
  setShowCreate: (v: boolean) => void;
  setEditingTask: (v: string | null) => void;
  setQuickViewTaskId: (v: string | null) => void;
  setCompleteTaskId: (v: string | null) => void;
  setTransferTaskId: (v: string | null) => void;
  setRejectTaskId: (v: string | null) => void;
  setRejectReviewId: (v: string | null) => void;
  setCancelTaskId: (v: string | null) => void;
  setRejectPlanTaskId: (v: string | null) => void;
  setExtensionTaskId: (v: string | null) => void;
  setApproveExtState: (v: { taskId: string; extId: string } | null) => void;
}

export function TaskListModals({
  tasks, currentUserId, role,
  showCreate, editingTask, quickViewTaskId,
  completeTaskId, transferTaskId, rejectTaskId, rejectReviewId,
  cancelTaskId, rejectPlanTaskId, extensionTaskId, approveExtState,
  setShowCreate, setEditingTask, setQuickViewTaskId,
  setCompleteTaskId, setTransferTaskId, setRejectTaskId, setRejectReviewId,
  setCancelTaskId, setRejectPlanTaskId, setExtensionTaskId, setApproveExtState,
}: TaskListModalsProps) {
  const complete         = useCompleteTask();
  const transfer         = useTransferTask();
  const rejectTask       = useRejectTask();
  const rejectReview     = useRejectReview();
  const rejectPlan       = useRejectPlan();
  const cancelTask       = useCancelTask();
  const requestExtension = useRequestExtension();
  const approveExtension = useApproveExtension();
  const rejectExtension  = useRejectExtension();

  const transferTask               = tasks.find((t) => t.id === transferTaskId);
  const transferCurrentAssigneeIds = transferTask?.assignees.map((a) => a.user.id) ?? [];
  const extensionTask              = tasks.find((t) => t.id === extensionTaskId);
  const rejectReviewTask           = tasks.find((t) => t.id === rejectReviewId);
  const rejectReviewCompletedAssignees = (rejectReviewTask?.assignees ?? [])
    .filter((a) => a.status === 'COMPLETED')
    .map((a) => ({ assigneeId: a.id, displayName: a.user.displayName }));

  return (
    <>
      <CreateTaskSheet open={showCreate} onClose={() => setShowCreate(false)} />
      <EditTaskModal taskId={editingTask} onClose={() => setEditingTask(null)} />

      <TaskQuickViewSheet
        open={!!quickViewTaskId}
        onOpenChange={(open) => { if (!open) setQuickViewTaskId(null); }}
        taskId={quickViewTaskId ?? ''}
        currentUserId={currentUserId}
        role={role}
      />

      <CompleteTaskModal
        open={!!completeTaskId}
        onClose={() => setCompleteTaskId(null)}
        isLoading={complete.isPending}
        onConfirm={(reportContent, files) =>
          complete.mutate(
            { taskId: completeTaskId!, reportContent, files },
            { onSuccess: () => setCompleteTaskId(null) },
          )
        }
      />

      <TransferModal
        open={!!transferTaskId}
        onClose={() => setTransferTaskId(null)}
        currentUserId={currentUserId}
        currentAssigneeIds={transferCurrentAssigneeIds}
        isLoading={transfer.isPending}
        onConfirm={(newAssigneeId, notes) =>
          transfer.mutate(
            { taskId: transferTaskId!, newAssigneeId, notes },
            { onSuccess: () => setTransferTaskId(null) },
          )
        }
      />

      <ReasonModal
        open={!!rejectTaskId}
        onClose={() => setRejectTaskId(null)}
        title="Từ chối nhận công việc"
        placeholder="Lý do từ chối..."
        confirmLabel="Từ chối"
        required
        isDestructive
        isLoading={rejectTask.isPending}
        onConfirm={(reason) =>
          rejectTask.mutate(
            { taskId: rejectTaskId!, reason },
            { onSuccess: () => setRejectTaskId(null) },
          )
        }
      />

      <RejectReviewModal
        open={!!rejectReviewId}
        onClose={() => setRejectReviewId(null)}
        completedAssignees={rejectReviewCompletedAssignees}
        isLoading={rejectReview.isPending}
        onConfirm={(entries) =>
          rejectReview.mutate({ taskId: rejectReviewId!, entries }, { onSuccess: () => setRejectReviewId(null) })
        }
      />

      <ReasonModal
        open={!!cancelTaskId}
        onClose={() => setCancelTaskId(null)}
        title="Hủy công việc"
        placeholder="Lý do hủy..."
        confirmLabel="Hủy công việc"
        isDestructive
        required
        isLoading={cancelTask.isPending}
        onConfirm={(reason) =>
          cancelTask.mutate(
            { taskId: cancelTaskId!, reason },
            { onSuccess: () => setCancelTaskId(null) },
          )
        }
      />

      <ReasonModal
        open={!!rejectPlanTaskId}
        onClose={() => setRejectPlanTaskId(null)}
        title="Từ chối công việc"
        placeholder="Lý do từ chối..."
        confirmLabel="Từ chối"
        isDestructive
        required
        isLoading={rejectPlan.isPending}
        onConfirm={(reason) =>
          rejectPlan.mutate(
            { taskId: rejectPlanTaskId!, reason },
            { onSuccess: () => setRejectPlanTaskId(null) },
          )
        }
      />

      {extensionTask && (
        <RequestExtensionModal
          open={!!extensionTaskId}
          onClose={() => setExtensionTaskId(null)}
          currentDeadline={extensionTask.scheduleEnd}
          isLoading={requestExtension.isPending}
          onConfirm={(reason, requestedDate) =>
            requestExtension.mutate(
              { taskId: extensionTaskId!, reason, requestedDate },
              { onSuccess: () => setExtensionTaskId(null) },
            )
          }
        />
      )}

      <ApproveExtensionModal
        open={!!approveExtState}
        onClose={() => setApproveExtState(null)}
        extension={approveExtState ? (() => {
          const task = tasks.find((t) => t.id === approveExtState.taskId);
          const ext  = task?.extensions.find((e) => e.id === approveExtState.extId);
          if (!ext) return null;
          return {
            id: ext.id,
            reason: ext.reason,
            requestedDate: ext.requestedDate,
            requesterName: ext.requester.displayName,
          };
        })() : null}
        isLoading={approveExtension.isPending || rejectExtension.isPending}
        onApprove={(extId, note) => approveExtension.mutate(
          { taskId: approveExtState!.taskId, extId, responseNote: note },
          { onSuccess: () => setApproveExtState(null) },
        )}
        onReject={(extId, note) => rejectExtension.mutate(
          { taskId: approveExtState!.taskId, extId, responseNote: note },
          { onSuccess: () => setApproveExtState(null) },
        )}
      />
    </>
  );
}
