'use client';

import React from 'react';
import { toast } from 'sonner';
import { useAcknowledgeTask } from '../actions/hooks/useAcknowledgeTask';
import { useApprovePlan } from '../actions/hooks/useApprovePlan';
import { useApproveReview } from '../actions/hooks/useApproveReview';

/** Inline quick-actions dùng trong TaskRowCard (không mở modal) */
export function useTaskCardActions(taskId: string) {
  const { mutate: acknowledgeTask } = useAcknowledgeTask();
  const { mutate: approvePlan }     = useApprovePlan();
  const { mutate: approveReview }   = useApproveReview();

  const handleAcknowledge = (e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledgeTask(taskId);
  };

  const handleApprovePlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    approvePlan(taskId);
  };

  const handleApproveReview = (e: React.MouseEvent) => {
    e.stopPropagation();
    approveReview(taskId);
  };

  return { handleAcknowledge, handleApprovePlan, handleApproveReview };
}
