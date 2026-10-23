'use client';

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { TaskActionButtons } from './TaskActionButtons';
import { ConfirmActionModal } from '../modals/ConfirmActionModal';
import { ReasonModal } from '../modals/ReasonModal';
import { RejectReviewModal } from '../modals/RejectReviewModal';
import { CompleteTaskModal } from '../modals/CompleteTaskModal';
import { TransferModal } from '../modals/TransferModal';
import { ReassignModal } from '../modals/ReassignModal';
import { RequestExtensionModal } from '../modals/RequestExtensionModal';
import { SupplementReportModal } from '../modals/SupplementReportModal';
import type { TaskPermissions } from '../../hooks/useTaskPermissions';
import { useTaskActionPanel } from '../../hooks/useTaskActionPanel';
import { acceptProgress, nextReportVersion, reportNextStep } from '../modals/action-dialog-rules';

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
    reports?: {
      content: string;
      version?: number;
      minorVersion?: number | null;
      attachments: { fileName: string; filePath: string; fileSize: number }[];
    }[];
  }[];
  /** Thẻ tóm tắt việc + chế độ (để hộp thoại hiện "điều gì xảy ra tiếp theo" đúng service V1) */
  task?: { code?: string | null; title: string; workflowMode?: string } | null;
}

export function TaskActionPanel({
  taskId, permissions, currentAssigneeIds, currentUserId, scheduleEnd, taskAssignees = [], task,
}: TaskActionPanelProps) {
  const panel = useTaskActionPanel();
  const isPending = {
    acknowledge: panel.acknowledge.isPending, complete: panel.complete.isPending,
    approvePlan: panel.approvePlan.isPending, rejectPlan: panel.rejectPlan.isPending,
    approveReview: panel.approveReview.isPending, rejectReview: panel.rejectReview.isPending,
    rejectTask: panel.rejectTask.isPending, transfer: panel.transfer.isPending,
    reassign: panel.reassign.isPending,
    cancelTask: panel.cancelTask.isPending, restoreTask: panel.restoreTask.isPending,
    supplementReport: panel.supplementReport.isPending,
    requestExtension: panel.requestExtension.isPending,
  };

  return (
    <>
      <TaskActionButtons permissions={permissions} onModal={panel.setModal} isPending={isPending} />
      <TaskActionModals
        panel={panel} taskId={taskId} currentAssigneeIds={currentAssigneeIds}
        currentUserId={currentUserId} scheduleEnd={scheduleEnd} taskAssignees={taskAssignees} task={task}
      />
    </>
  );
}

export interface TaskActionModalsProps extends Omit<TaskActionPanelProps, 'permissions'> {
  /** Kết quả `useTaskActionPanel()` — chung một trạng thái modal với nơi đặt nút */
  panel: ReturnType<typeof useTaskActionPanel>;
}

/**
 * Bộ hộp thoại hành động (V2 A2-2: khung `ActionDialog`, song ngữ). Mutation/payload/điều kiện giữ nguyên V1.
 * Câu "điều gì xảy ra tiếp theo" chỉ hiện khi đủ dữ liệu để nói đúng theo service V1.
 */
export function TaskActionModals({
  panel, taskId, currentAssigneeIds, currentUserId, scheduleEnd, taskAssignees = [], task,
}: TaskActionModalsProps) {
  const t = useTranslations();
  const {
    modal, close,
    acknowledge, complete, approvePlan, rejectPlan,
    approveReview, rejectReview, rejectTask,
    transfer, reassign, cancelTask, restoreTask, supplementReport, requestExtension,
  } = panel;

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

  const card = task ? { code: task.code, title: task.title } : null;
  const title = task?.title ?? '';
  const mine = taskAssignees.find((a) => a.user.id === currentUserId);
  const myReports = mine?.reports?.every((r) => typeof r.version === 'number')
    ? mine.reports.map((r) => ({ version: r.version as number, minorVersion: r.minorVersion ?? 0 }))
    : null;
  const next = taskAssignees.length
    ? reportNextStep({ workflowMode: task?.workflowMode, assignees: taskAssignees, viewerId: currentUserId })
    : null;
  const progress = acceptProgress(taskAssignees);

  return (
    <>
      {scheduleEnd && (
        <RequestExtensionModal open={modal === 'extension'} onClose={close} task={card}
          currentDeadline={scheduleEnd} isLoading={requestExtension.isPending}
          onConfirm={(reason, requestedDate) =>
            requestExtension.mutate({ taskId, reason, requestedDate }, { onSuccess: close })
          }
        />
      )}

      <ConfirmActionModal open={modal === 'acknowledge'} onClose={close} task={card}
        title={t('app.dlg.accept.t')}
        description={task ? t('tdx.dlg.accept.d', { t: title }) : undefined}
        note={progress ? t('app.dlg.accept.multi', progress) : undefined} noteIcon={Users}
        confirmLabel={t('act.accept')} isLoading={acknowledge.isPending}
        onConfirm={() => acknowledge.mutate(taskId, { onSuccess: close })}
      />

      <CompleteTaskModal taskId={taskId} open={modal === 'complete'} onClose={close} task={card}
        version={myReports ? nextReportVersion(myReports, 'complete') : null} next={next}
        isLoading={complete.isPending}
        onConfirm={(reportContent, files) =>
          complete.mutate({ taskId, reportContent, files }, { onSuccess: close })
        }
      />

      <ConfirmActionModal open={modal === 'approve-plan'} onClose={close} task={card}
        title={t('app.dlg.approve.t')}
        description={t('app.dlg.approve.d', { t: title, s: t('st.WAITING_ACKNOWLEDGE') })}
        confirmLabel={t('act.approve')} isLoading={approvePlan.isPending}
        onConfirm={() => approvePlan.mutate(taskId, { onSuccess: close })}
      />

      {/* V1 ở chi tiết: lý do Từ chối kế hoạch KHÔNG bắt buộc */}
      <ReasonModal open={modal === 'reject-plan'} onClose={close} task={card}
        title={t('app.dlg.reject.t')} description={t('tdx.dlg.reject.d')}
        placeholder={t('app.dlg.reject.ph')}
        confirmLabel={t('app.dlg.reject.ok')} danger isLoading={rejectPlan.isPending}
        onConfirm={(reason) => rejectPlan.mutate({ taskId, reason }, { onSuccess: close })}
      />

      <ConfirmActionModal open={modal === 'approve-review'} onClose={close} task={card}
        title={t('app.dlg.review.t')}
        description={t('app.dlg.review.d', { t: title, s: t('st.COMPLETED') })}
        confirmLabel={t('act.review')} isLoading={approveReview.isPending}
        onConfirm={() => approveReview.mutate(taskId, { onSuccess: close })}
      />

      <RejectReviewModal open={modal === 'reject-review'} onClose={close} task={card}
        completedAssignees={completedAssignees} isLoading={rejectReview.isPending}
        onConfirm={(entries) => rejectReview.mutate({ taskId, entries }, { onSuccess: close })}
      />

      <ReasonModal open={modal === 'reject-task'} onClose={close} task={card}
        title={t('app.dlg.decline.t')} placeholder={t('app.dlg.decline.ph')}
        note={t('tdx.dlg.decline.note')}
        confirmLabel={t('act.decline')} required isLoading={rejectTask.isPending}
        onConfirm={(reason) => rejectTask.mutate({ taskId, reason }, { onSuccess: close })}
      />

      <TransferModal open={modal === 'transfer'} onClose={close} task={card}
        currentUserId={currentUserId} currentAssigneeIds={currentAssigneeIds}
        isLoading={transfer.isPending}
        onConfirm={(newAssigneeId, notes) =>
          transfer.mutate({ taskId, newAssigneeId, notes }, { onSuccess: close })
        }
      />

      <ReassignModal open={modal === 'reassign'} onClose={close} task={card}
        isLoading={reassign.isPending}
        onConfirm={(newAssigneeIds) =>
          reassign.mutate({ taskId, newAssigneeIds }, { onSuccess: close })
        }
      />

      <ReasonModal open={modal === 'cancel'} onClose={close} task={card}
        title={t('app.dlg.cancel.t')} description={t('tdx.dlg.cancel.d')}
        label={t('app.dlg.cancel.label')} placeholder={t('app.dlg.cancel.ph')} required
        confirmLabel={t('act.cancel')} danger isLoading={cancelTask.isPending}
        onConfirm={(reason) => cancelTask.mutate({ taskId, reason }, { onSuccess: close })}
      />

      <ConfirmActionModal open={modal === 'restore'} onClose={close} task={card}
        title={t('app.dlg.restore.t')} description={t('tdx.dlg.restore.d')}
        note={t('app.dlg.restore.ppl')} noteIcon={Users}
        confirmLabel={t('act.restore')} isLoading={restoreTask.isPending}
        onConfirm={() => restoreTask.mutate(taskId, { onSuccess: close })}
      />

      <SupplementReportModal taskId={taskId} open={modal === 'supplement'} onClose={close} task={card}
        version={myReports ? nextReportVersion(myReports, 'supplement') : null}
        isLoading={supplementReport.isPending}
        onConfirm={(content, files) =>
          supplementReport.mutate({ taskId, content, files }, { onSuccess: close })
        }
      />
    </>
  );
}
