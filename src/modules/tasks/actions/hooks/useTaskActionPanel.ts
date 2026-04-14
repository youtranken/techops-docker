'use client';

import { useState } from 'react';
import { useAcknowledgeTask } from './useAcknowledgeTask';
import { useCompleteTask } from './useCompleteTask';
import { useApprovePlan } from './useApprovePlan';
import { useRejectPlan } from './useRejectPlan';
import { useApproveReview } from './useApproveReview';
import { useRejectReview } from './useRejectReview';
import { useRejectTask } from './useRejectTask';
import { useTransferTask } from './useTransferTask';
import { useReassignTask } from './useReassignTask';
import { useDeleteTask } from './useDeleteTask';
import { useCancelTask } from './useCancelTask';
import { useRequestExtension } from './useExtensions';

export type ActionModalType =
  | 'acknowledge' | 'complete' | 'approve-plan' | 'reject-plan'
  | 'approve-review' | 'reject-review' | 'reject-task'
  | 'transfer' | 'reassign' | 'cancel' | 'delete' | 'extension' | null;

export function useTaskActionPanel() {
  const [modal, setModal] = useState<ActionModalType>(null);
  const close = () => setModal(null);

  const acknowledge     = useAcknowledgeTask();
  const complete        = useCompleteTask();
  const approvePlan     = useApprovePlan();
  const rejectPlan      = useRejectPlan();
  const approveReview   = useApproveReview();
  const rejectReview    = useRejectReview();
  const rejectTask      = useRejectTask();
  const transfer        = useTransferTask();
  const reassign        = useReassignTask();
  const deleteTask      = useDeleteTask();
  const cancelTask      = useCancelTask();
  const requestExtension = useRequestExtension();

  const anyLoading =
    acknowledge.isPending || complete.isPending || approvePlan.isPending ||
    rejectPlan.isPending || approveReview.isPending || rejectReview.isPending ||
    rejectTask.isPending || transfer.isPending || reassign.isPending ||
    deleteTask.isPending || cancelTask.isPending || requestExtension.isPending;

  return {
    modal, setModal, close,
    acknowledge, complete, approvePlan, rejectPlan,
    approveReview, rejectReview, rejectTask,
    transfer, reassign, deleteTask, cancelTask, requestExtension,
    anyLoading,
  };
}
