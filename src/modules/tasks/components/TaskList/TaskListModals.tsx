'use client';

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { TaskFormDrawer } from '../TaskForm/TaskFormDrawer';
import { CompleteTaskModal } from '../../actions/components/modals/CompleteTaskModal';
import { TransferModal } from '../../actions/components/modals/TransferModal';
import { ReasonModal } from '../../actions/components/modals/ReasonModal';
import { RejectReviewModal } from '../../actions/components/modals/RejectReviewModal';
import { RequestExtensionModal } from '../../actions/components/modals/RequestExtensionModal';
import { ApproveExtensionModal } from '../../actions/components/modals/ApproveExtensionModal';
import { TaskDetailDrawer } from '../TaskDetail/TaskDetailDrawer';
import type { TaskListItem } from '../../services/task-query.service';
import { useCompleteTask } from '../../actions/hooks/useCompleteTask';
import { useTransferTask } from '../../actions/hooks/useTransferTask';
import { useRejectTask } from '../../actions/hooks/useRejectTask';
import { useRejectReview } from '../../actions/hooks/useRejectReview';
import { useRejectPlan } from '../../actions/hooks/useRejectPlan';
import { useCancelTask } from '../../actions/hooks/useCancelTask';
import { useRestoreTask } from '../../actions/hooks/useRestoreTask';
import { useSupplementReport } from '../../actions/hooks/useSupplementReport';
import { ConfirmActionModal } from '../../actions/components/modals/ConfirmActionModal';
import { SupplementReportModal } from '../../actions/components/modals/SupplementReportModal';
import { useRequestExtension, useApproveExtension, useRejectExtension } from '../../actions/hooks/useExtensions';
import { useAcknowledgeTask } from '../../actions/hooks/useAcknowledgeTask';
import { useApprovePlan } from '../../actions/hooks/useApprovePlan';
import { useApproveReview } from '../../actions/hooks/useApproveReview';
import { acceptProgress } from '../../actions/components/modals/action-dialog-rules';
import type { ListConfirmKind } from '../../hooks/useTaskListModals';

interface TaskListModalsProps {
  tasks: TaskListItem[];
  currentUserId: string;
  role: string;
  showCreate: boolean;
  createDraftId: string | null;
  editingTask: string | null;
  quickViewTaskId: string | null;
  completeTaskId: string | null;
  transferTaskId: string | null;
  rejectTaskId: string | null;
  rejectReviewId: string | null;
  cancelTaskId: string | null;
  restoreTaskId: string | null;
  supplementTaskId: string | null;
  rejectPlanTaskId: string | null;
  extensionTaskId: string | null;
  approveExtState: { taskId: string; extId: string } | null;
  confirmState: { kind: ListConfirmKind; taskId: string } | null;
  setShowCreate: (v: boolean) => void;
  setCreateDraftId: (v: string | null) => void;
  setEditingTask: (v: string | null) => void;
  setQuickViewTaskId: (v: string | null) => void;
  setCompleteTaskId: (v: string | null) => void;
  setTransferTaskId: (v: string | null) => void;
  setRejectTaskId: (v: string | null) => void;
  setRejectReviewId: (v: string | null) => void;
  setCancelTaskId: (v: string | null) => void;
  setRestoreTaskId: (v: string | null) => void;
  setSupplementTaskId: (v: string | null) => void;
  setRejectPlanTaskId: (v: string | null) => void;
  setExtensionTaskId: (v: string | null) => void;
  setApproveExtState: (v: { taskId: string; extId: string } | null) => void;
  setConfirmState: (v: { kind: ListConfirmKind; taskId: string } | null) => void;
}

export function TaskListModals({
  tasks, currentUserId, role,
  showCreate, createDraftId, editingTask, quickViewTaskId,
  completeTaskId, transferTaskId, rejectTaskId, rejectReviewId,
  cancelTaskId, restoreTaskId, supplementTaskId, rejectPlanTaskId, extensionTaskId, approveExtState, confirmState,
  setShowCreate, setCreateDraftId, setEditingTask, setQuickViewTaskId,
  setCompleteTaskId, setTransferTaskId, setRejectTaskId, setRejectReviewId,
  setCancelTaskId, setRestoreTaskId, setSupplementTaskId, setRejectPlanTaskId, setExtensionTaskId, setApproveExtState, setConfirmState,
}: TaskListModalsProps) {
  const t                = useTranslations();
  const complete         = useCompleteTask();
  const transfer         = useTransferTask();
  const rejectTask       = useRejectTask();
  const rejectReview     = useRejectReview();
  const rejectPlan       = useRejectPlan();
  const cancelTask       = useCancelTask();
  const restoreTask      = useRestoreTask();
  const supplementReport = useSupplementReport();
  const requestExtension = useRequestExtension();
  const approveExtension = useApproveExtension();
  const rejectExtension  = useRejectExtension();
  const acknowledge      = useAcknowledgeTask();
  const approvePlan      = useApprovePlan();
  const approveReview    = useApproveReview();

  const transferTask               = tasks.find((t) => t.id === transferTaskId);
  const transferCurrentAssigneeIds = transferTask?.assignees.map((a) => a.user.id) ?? [];
  const extensionTask              = tasks.find((t) => t.id === extensionTaskId);
  const rejectReviewTask           = tasks.find((t) => t.id === rejectReviewId);
  /** Thẻ tóm tắt việc trong hộp thoại (mã + tiêu đề) */
  const card = (id: string | null) => {
    const x = id ? tasks.find((t) => t.id === id) : undefined;
    return x ? { code: x.taskCode, title: x.title } : null;
  };
  const confirmTask     = confirmState ? tasks.find((x) => x.id === confirmState.taskId) : undefined;
  const confirmTitle    = confirmTask?.title ?? '';
  const closeConfirm    = () => setConfirmState(null);
  const confirmProgress = confirmTask ? acceptProgress(confirmTask.assignees) : null;
  const rejectReviewCompletedAssignees = (rejectReviewTask?.assignees ?? [])
    .filter((a) => a.status === 'COMPLETED')
    .map((a) => ({ assigneeId: a.id, displayName: a.user.displayName }));

  return (
    <>
      {/* V2 A2-4b: Tạo / Sửa trong ngăn trượt phải (nháp Tạo việc chỉ lưu trên trình duyệt) */}
      <TaskFormDrawer
        open={showCreate}
        mode="create"
        draftId={createDraftId}
        onClose={() => { setShowCreate(false); setCreateDraftId(null); }}
        onReopenDraft={(id) => { setCreateDraftId(id); setShowCreate(true); }}
      />
      <TaskFormDrawer open={!!editingTask} mode="edit" taskId={editingTask} onClose={() => setEditingTask(null)} />

      {/* V2 A2-1: ngăn xem nhanh mới (‹ › theo thứ tự danh sách đang hiển thị) */}
      <TaskDetailDrawer
        taskId={quickViewTaskId}
        ids={tasks.map((t) => t.id)}
        onNavigate={setQuickViewTaskId}
        onClose={() => setQuickViewTaskId(null)}
      />

      {/* V2 A2-3: Nhận việc / Duyệt / Nghiệm thu từ menu ⋯ mở hộp xác nhận A2-2 (V1 thẻ gọi API ngay). API không đổi. */}
      <ConfirmActionModal open={confirmState?.kind === 'acknowledge'} onClose={closeConfirm} task={card(confirmState?.taskId ?? null)}
        title={t('app.dlg.accept.t')}
        description={confirmTask ? t('tdx.dlg.accept.d', { t: confirmTitle }) : undefined}
        note={confirmProgress ? t('app.dlg.accept.multi', confirmProgress) : undefined} noteIcon={Users}
        confirmLabel={t('act.accept')} isLoading={acknowledge.isPending}
        onConfirm={() => acknowledge.mutate(confirmState!.taskId, { onSuccess: closeConfirm })}
      />
      <ConfirmActionModal open={confirmState?.kind === 'approve-plan'} onClose={closeConfirm} task={card(confirmState?.taskId ?? null)}
        title={t('app.dlg.approve.t')}
        description={t('app.dlg.approve.d', { t: confirmTitle, s: t('st.WAITING_ACKNOWLEDGE') })}
        confirmLabel={t('act.approve')} isLoading={approvePlan.isPending}
        onConfirm={() => approvePlan.mutate(confirmState!.taskId, { onSuccess: closeConfirm })}
      />
      <ConfirmActionModal open={confirmState?.kind === 'approve-review'} onClose={closeConfirm} task={card(confirmState?.taskId ?? null)}
        title={t('app.dlg.review.t')}
        description={t('app.dlg.review.d', { t: confirmTitle, s: t('st.COMPLETED') })}
        confirmLabel={t('act.review')} isLoading={approveReview.isPending}
        onConfirm={() => approveReview.mutate(confirmState!.taskId, { onSuccess: closeConfirm })}
      />

      <CompleteTaskModal
        taskId={completeTaskId ?? undefined}
        task={card(completeTaskId)}
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
        task={card(transferTaskId)}
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
        task={card(rejectTaskId)}
        title={t('app.dlg.decline.t')}
        placeholder={t('app.dlg.decline.ph')}
        note={t('tdx.dlg.decline.note')}
        confirmLabel={t('act.decline')}
        required
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
        task={card(rejectReviewId)}
        completedAssignees={rejectReviewCompletedAssignees}
        isLoading={rejectReview.isPending}
        onConfirm={(entries) =>
          rejectReview.mutate({ taskId: rejectReviewId!, entries }, { onSuccess: () => setRejectReviewId(null) })
        }
      />

      <ReasonModal
        open={!!cancelTaskId}
        onClose={() => setCancelTaskId(null)}
        task={card(cancelTaskId)}
        title={t('app.dlg.cancel.t')}
        description={t('tdx.dlg.cancel.d')}
        label={t('app.dlg.cancel.label')}
        placeholder={t('app.dlg.cancel.ph')}
        confirmLabel={t('act.cancel')}
        danger
        required
        isLoading={cancelTask.isPending}
        onConfirm={(reason) =>
          cancelTask.mutate(
            { taskId: cancelTaskId!, reason },
            { onSuccess: () => setCancelTaskId(null) },
          )
        }
      />

      <ConfirmActionModal
        open={!!restoreTaskId}
        onClose={() => setRestoreTaskId(null)}
        task={card(restoreTaskId)}
        title={t('app.dlg.restore.t')}
        description={t('tdx.dlg.restore.d')}
        note={t('app.dlg.restore.ppl')}
        noteIcon={Users}
        confirmLabel={t('act.restore')}
        isLoading={restoreTask.isPending}
        onConfirm={() => restoreTask.mutate(restoreTaskId!, { onSuccess: () => setRestoreTaskId(null) })}
      />

      <SupplementReportModal
        taskId={supplementTaskId ?? undefined}
        task={card(supplementTaskId)}
        open={!!supplementTaskId}
        onClose={() => setSupplementTaskId(null)}
        isLoading={supplementReport.isPending}
        onConfirm={(content, files) =>
          supplementReport.mutate(
            { taskId: supplementTaskId!, content, files },
            { onSuccess: () => setSupplementTaskId(null) },
          )
        }
      />

      <ReasonModal
        open={!!rejectPlanTaskId}
        onClose={() => setRejectPlanTaskId(null)}
        task={card(rejectPlanTaskId)}
        title={t('app.dlg.reject.t')}
        description={t('tdx.dlg.reject.d')}
        confirmLabel={t('app.dlg.reject.ok')}
        danger
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
          task={card(extensionTaskId)}
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
        task={card(approveExtState?.taskId ?? null)}
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
