import { useState } from 'react';

/** Hành động chỉ cần xác nhận (không nhập gì) mở từ menu ⋯ của danh sách — cùng hộp thoại A2-2 với chi tiết. */
export type ListConfirmKind = 'acknowledge' | 'approve-plan' | 'approve-review';

export function useTaskListModals() {
  const [showCreate,       setShowCreate]       = useState(false);
  const [editingTask,      setEditingTask]      = useState<string | null>(null);
  const [quickViewTaskId,  setQuickViewTaskId]  = useState<string | null>(null);
  const [completeTaskId,   setCompleteTaskId]   = useState<string | null>(null);
  const [transferTaskId,   setTransferTaskId]   = useState<string | null>(null);
  const [rejectTaskId,     setRejectTaskId]     = useState<string | null>(null);
  const [rejectReviewId,   setRejectReviewId]   = useState<string | null>(null);
  const [cancelTaskId,     setCancelTaskId]     = useState<string | null>(null);
  const [restoreTaskId,    setRestoreTaskId]    = useState<string | null>(null);
  const [supplementTaskId, setSupplementTaskId] = useState<string | null>(null);
  const [rejectPlanTaskId, setRejectPlanTaskId] = useState<string | null>(null);
  const [extensionTaskId,  setExtensionTaskId]  = useState<string | null>(null);
  const [approveExtState,  setApproveExtState]  = useState<{ taskId: string; extId: string } | null>(null);
  const [confirmState,     setConfirmState]     = useState<{ kind: ListConfirmKind; taskId: string } | null>(null);

  return {
    showCreate,       setShowCreate,
    editingTask,      setEditingTask,
    quickViewTaskId,  setQuickViewTaskId,
    completeTaskId,   setCompleteTaskId,
    transferTaskId,   setTransferTaskId,
    rejectTaskId,     setRejectTaskId,
    rejectReviewId,   setRejectReviewId,
    cancelTaskId,     setCancelTaskId,
    restoreTaskId,    setRestoreTaskId,
    supplementTaskId, setSupplementTaskId,
    rejectPlanTaskId, setRejectPlanTaskId,
    extensionTaskId,  setExtensionTaskId,
    approveExtState,  setApproveExtState,
    confirmState,     setConfirmState,
  };
}
