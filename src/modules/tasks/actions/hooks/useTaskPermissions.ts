'use client';

/**
 * Pure-JS permission hook — NO API call, NO RBAC module.
 * Uses ACTION_MATRIX hardcoded by role × status × context.
 */

import { getAllowedActions, type TaskAction } from '../config/taskActionMatrix';
import type { TaskListItem } from '../../services/task-query.service';

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canAcknowledge: boolean;
  canComplete: boolean;
  canTransfer: boolean;
  canRejectTask: boolean;
  canApprovePlan: boolean;
  canRejectPlan: boolean;
  canApproveReview: boolean;
  canRejectReview: boolean;
  canRequestExtension: boolean;
  canWithdrawExtension: boolean;
  canApproveExtension: boolean;
  canReassign: boolean;
  canToggleForceMode: boolean;

  isBoss: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isCreator: boolean;
  isAssignee: boolean;
  currentUserAssignee: TaskListItem['assignees'][number] | null;
  allFailed: boolean;
  isLoading: false;
}

export function useTaskPermissions(
  task: TaskListItem | null | undefined,
  currentUserId: string,
  role: string,
): TaskPermissions {
  // Guard: task chưa load → trả về all-false
  if (!task) {
    return {
      canEdit: false, canDelete: false, canCancel: false,
      canAcknowledge: false, canComplete: false, canTransfer: false,
      canRejectTask: false, canApprovePlan: false, canRejectPlan: false,
      canApproveReview: false, canRejectReview: false,
      canRequestExtension: false, canWithdrawExtension: false,
      canApproveExtension: false, canReassign: false, canToggleForceMode: false,
      isBoss: false, isAdmin: false, isEmployee: false,
      isCreator: false, isAssignee: false,
      currentUserAssignee: null, allFailed: false, isLoading: false,
    };
  }

  const isCreator           = task.creator.id === currentUserId;
  const currentUserAssignee = task.assignees.find((a) => a.user.id === currentUserId) ?? null;
  const isAssignee          = Boolean(currentUserAssignee);
  const assigneeStatus      = currentUserAssignee?.status;

  const isBoss     = role === 'BOSS';
  const isAdmin    = role === 'ADMIN';
  const isEmployee = role === 'EMPLOYEE';

  const allFailed =
    task.assignees.length > 0 &&
    task.assignees.every((a) => ['REJECTED', 'TRANSFERRED'].includes(a.status));

  // true khi tất cả assignees đã nhận (IN_PROGRESS/COMPLETED/...) → khoá EDIT/CANCEL của creator
  const allAssigneesAccepted =
    task.assignees.length > 0 &&
    task.assignees.every((a) =>
      ['IN_PROGRESS', 'COMPLETED', 'REVISION_REQUIRED', 'TRANSFERRED'].includes(a.status),
    );

  const allowed = getAllowedActions({
    status:               task.status,
    role,
    isCreator,
    isAssignee,
    assigneeStatus,
    isForceMode:          task.isForceMode,
    workflowMode:         task.workflowMode,
    allAssigneesAccepted,
    allFailed,
  });

  const has = (action: TaskAction) => allowed.includes(action);

  return {
    canEdit:   has('EDIT'),
    canDelete: has('DELETE'),
    canCancel: has('CANCEL'),

    // canAcknowledge: assignee PENDING — cả WAITING_ACKNOWLEDGE lẫn IN_PROGRESS (sau transfer)
    canAcknowledge: has('ACKNOWLEDGE') && isAssignee && assigneeStatus === 'PENDING',

    canComplete: has('COMPLETE') && isAssignee && ['IN_PROGRESS', 'REVISION_REQUIRED'].includes(assigneeStatus ?? ''),
    canTransfer: has('TRANSFER') && isAssignee && assigneeStatus === 'IN_PROGRESS',

    // canRejectTask: assignee PENDING và KHÔNG phải creator (creator không tự từ chối)
    canRejectTask: has('REJECT') && isAssignee && assigneeStatus === 'PENDING' && !isCreator,

    canApprovePlan:   has('APPROVE')       && task.status === 'PENDING_APPROVAL',
    canRejectPlan:    has('REJECT')         && task.status === 'PENDING_APPROVAL',
    canApproveReview: has('APPROVE')        && task.status === 'PENDING_REVIEW',
    canRejectReview:  has('REJECT_REVIEW'),

    canRequestExtension:  has('REQUEST_EXTENSION') && isAssignee && assigneeStatus === 'IN_PROGRESS' && task.workflowMode !== 'IMMEDIATE',
    canWithdrawExtension: has('WITHDRAW_EXTENSION') && isAssignee && assigneeStatus === 'IN_PROGRESS',
    canApproveExtension:  has('APPROVE_EXTENSION'),

    canReassign:        has('REASSIGN'),
    canToggleForceMode: has('FORCE_MODE'),

    isBoss,
    isAdmin,
    isEmployee,
    isCreator,
    isAssignee,
    currentUserAssignee,
    allFailed,
    isLoading: false,
  };
}
