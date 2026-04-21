/**
 * Hardcoded Action Matrix — NO API call needed.
 * Replaces the RBAC permission system entirely.
 * Source: doc_plan + src_old/features/tasks/config/taskActionMatrix.ts
 */

export type TaskAction =
  | 'VIEW' | 'EDIT' | 'CANCEL' | 'RESTORE'
  | 'APPROVE' | 'REJECT' | 'ACKNOWLEDGE'
  | 'TRANSFER' | 'COMPLETE'
  | 'REQUEST_EXTENSION' | 'WITHDRAW_EXTENSION' | 'APPROVE_EXTENSION'
  | 'REASSIGN' | 'FORCE_MODE' | 'REJECT_REVIEW';

// STATUS × ROLE → allowed actions
export const ACTION_MATRIX: Record<string, Record<string, TaskAction[]>> = {
  // 1. CHỜ DUYỆT (Employee tạo NEED_APPROVAL → chờ Boss duyệt)
  //    - Chỉ CREATOR và BOSS/ADMIN nhìn thấy. Assignee chưa được phép xem.
  PENDING_APPROVAL: {
    BOSS:    ['VIEW', 'APPROVE', 'REJECT', 'EDIT'],
    CREATOR: ['VIEW', 'EDIT', 'CANCEL'],          // Employee creator only
    ADMIN:   ['VIEW', 'APPROVE', 'REJECT', 'EDIT', 'CANCEL'],
    OTHER:   [],                                  // ← FIX Bug2: assignee/người khác KHÔNG thấy khi chưa duyệt
  },

  // 2. CHỜ TIẾP NHẬN
  //    - ASSIGNEE_PENDING: chỉ assignee đang PENDING mới ACKNOWLEDGE/REJECT
  //    - CREATOR_ONLY: creator không phải assignee → chỉ EDIT/CANCEL
  WAITING_ACKNOWLEDGE: {
    BOSS:             ['VIEW', 'EDIT', 'CANCEL', 'FORCE_MODE'],
    CREATOR_ONLY:     ['VIEW'],           // creator nhưng KHÔNG phải assignee — Boss đã duyệt, không còn EDIT
    ASSIGNEE_PENDING: ['VIEW', 'ACKNOWLEDGE', 'REJECT'],  // Transfer chỉ ở IN_PROGRESS
    ADMIN:            ['VIEW', 'EDIT', 'CANCEL', 'REASSIGN', 'FORCE_MODE'],
    OTHER:            ['VIEW'],
  },

  // 3. ĐANG THỰC HIỆN
  //    - ASSIGNEE_PENDING: người mới được transfer vào, chưa acknowledge
  //    - ASSIGNEE: người đang IN_PROGRESS
  //    - CREATOR_ONLY: Direct flow → EDIT; Approval flow → EDIT bị xóa bởi post-condition (plan locked)
  IN_PROGRESS: {
    BOSS:             ['VIEW', 'EDIT', 'FORCE_MODE', 'APPROVE_EXTENSION', 'CANCEL'],
    CREATOR_ONLY:     ['VIEW', 'EDIT'],           // Direct: EDIT ok; Approval: post-condition xóa EDIT
    ASSIGNEE_PENDING: ['VIEW', 'ACKNOWLEDGE', 'REJECT'],
    ASSIGNEE:         ['VIEW', 'EDIT', 'COMPLETE', 'TRANSFER', 'REQUEST_EXTENSION', 'WITHDRAW_EXTENSION'],
    ADMIN:            ['VIEW', 'EDIT', 'FORCE_MODE', 'CANCEL', 'APPROVE_EXTENSION', 'REASSIGN'],
    OTHER:            ['VIEW'],
  },

  // 4. CHỜ REVIEW (Boss review)
  PENDING_REVIEW: {
    BOSS:     ['VIEW', 'APPROVE', 'REJECT_REVIEW'],
    CREATOR:  ['VIEW'],
    ASSIGNEE: ['VIEW'],
    ADMIN:    ['VIEW', 'APPROVE', 'REJECT_REVIEW', 'CANCEL'],
    OTHER:    ['VIEW'],
  },

  // 4b. YÊU CẦU SỬA (Boss từ chối review → assignee nộp lại)
  REVISION_REQUIRED: {
    BOSS:     ['VIEW', 'APPROVE', 'REJECT_REVIEW'],
    CREATOR:  ['VIEW'],
    ASSIGNEE: ['VIEW', 'COMPLETE'],  // spec: chỉ nộp lại (Complete), không Transfer
    ADMIN:    ['VIEW', 'APPROVE', 'REJECT_REVIEW', 'CANCEL'],
    OTHER:    ['VIEW'],
  },
  // 5. HOÀN THÀNH
  COMPLETED: {
    ALL:   ['VIEW'],
    ADMIN: ['VIEW'],
  },

  // 6. ĐÃ HỦY
  CANCELLED: {
    ALL:   ['VIEW'],
    ADMIN: ['VIEW', 'RESTORE'],
  },
};

export interface GetActionsParams {
  status: string;
  role: string;           // 'BOSS' | 'EMPLOYEE' | 'ADMIN'
  isCreator: boolean;
  isAssignee: boolean;
  assigneeStatus?: string;
  isForceMode: boolean;
  workflowMode: string;
  allAssigneesAccepted?: boolean; // true khi tất cả assignees đã IN_PROGRESS (để khoà EDIT/CANCEL)
  allFailed?: boolean;            // true khi tất cả từ chối — creator được phép CANCEL
}

/**
 * Pure function — no async, no API.
 * Returns the set of allowed actions for a user on a task.
 */
export function getAllowedActions(p: GetActionsParams): TaskAction[] {
  const matrix = ACTION_MATRIX[p.status];
  if (!matrix) return ['VIEW'];

  let allowed = new Set<TaskAction>();

  if (p.role === 'ADMIN') {
    (matrix.ADMIN || matrix.ALL || ['VIEW']).forEach((a) => allowed.add(a));
  } else if (p.role === 'BOSS') {
    (matrix.BOSS || matrix.ALL || ['VIEW']).forEach((a) => allowed.add(a));
    // Boss tự assign vào task: cũng được ASSIGNEE actions theo assigneeStatus
    if (p.isAssignee) {
      if (p.assigneeStatus === 'PENDING') {
        (matrix.ASSIGNEE_PENDING || []).forEach((a) => allowed.add(a));
      } else if (['IN_PROGRESS', 'REVISION_REQUIRED'].includes(p.assigneeStatus ?? '')) {
        (matrix.ASSIGNEE || []).forEach((a) => allowed.add(a));
      }
    }
  } else {
    // ── EMPLOYEE ──────────────────────────────────────────────────────────

    const isAssigneePending    = p.isAssignee && p.assigneeStatus === 'PENDING';
    const isAssigneeInProgress = p.isAssignee && p.assigneeStatus === 'IN_PROGRESS';
    const isAssigneeRevision   = p.isAssignee && p.assigneeStatus === 'REVISION_REQUIRED';
    const isCreatorOnly        = p.isCreator && !p.isAssignee;

    // Creator-only slot (creator nhưng không assign vào task)
    if (isCreatorOnly) {
      (matrix.CREATOR_ONLY || matrix.CREATOR || []).forEach((a) => allowed.add(a));
    }

    // Creator AND assignee — lấy creator slot nhưng KHÔNG lấy REJECT (không tự từ chối task mình tạo)
    if (p.isCreator && p.isAssignee) {
      const creatorActions = (matrix.CREATOR_ONLY || matrix.CREATOR || []).filter(
        (a) => a !== 'REJECT',  // ← FIX Bug3: creator không được tự từ chối
      );
      creatorActions.forEach((a) => allowed.add(a));
    }

    // Assignee slot — phân theo assigneeStatus
    if (p.isAssignee) {
      if (isAssigneePending) {
        // PENDING: cần acknowledge hoặc reject
        // Nếu là creator tự assign → không được reject
        const pendingActions = (matrix.ASSIGNEE_PENDING || []).filter((a) => {
          if (p.isCreator && a === 'REJECT') return false; // ← FIX Bug3
          return true;
        });
        pendingActions.forEach((a) => allowed.add(a));
      } else if (isAssigneeInProgress || isAssigneeRevision) {
        (matrix.ASSIGNEE || []).forEach((a) => allowed.add(a));
      }
      // COMPLETED / REJECTED / TRANSFERRED / CANCELLED → chỉ VIEW
    }

    // Không match gì → OTHER
    if (allowed.size === 0) {
      (matrix.OTHER || matrix.ALL || ['VIEW']).forEach((a) => allowed.add(a));
    }
  }

  // G4: FORCE_MODE chỉ áp dụng khi workflow = APPROVAL
  if (p.workflowMode !== 'NEED_APPROVAL') {
    allowed.delete('FORCE_MODE');
  }

  // Force mode: khoá REJECT và TRANSFER
  if (p.isForceMode) {
    allowed.delete('REJECT');
    allowed.delete('TRANSFER');
    if (!['BOSS', 'ADMIN'].includes(p.role)) allowed.delete('CANCEL');
  }

  // ── CANCEL chỉ khi chưa có assignee nào nhận (allAssigneesAccepted = false) ─
  if (p.isCreator && !p.isAssignee && p.allAssigneesAccepted && p.workflowMode !== 'IMMEDIATE') {
    allowed.delete('CANCEL');
  }

  // ── Direct flow (IMMEDIATE): creator được EDIT ở WAITING_ACKNOWLEDGE ──
  if (p.workflowMode === 'IMMEDIATE' && p.isCreator && !p.isAssignee
      && p.status === 'WAITING_ACKNOWLEDGE') {
    allowed.add('EDIT');
  }

  // ── Approval flow: plan bị lock sau khi Boss duyệt — employee không được EDIT ──
  // (chỉ PENDING_APPROVAL mới cho employee edit; WAITING_ACKNOWLEDGE và IN_PROGRESS bị lock)
  if (p.workflowMode !== 'IMMEDIATE' && !['BOSS', 'ADMIN'].includes(p.role)
      && ['WAITING_ACKNOWLEDGE', 'IN_PROGRESS'].includes(p.status)) {
    allowed.delete('EDIT');
  }

  // ── Creator-only: thêm CANCEL khi allFailed (tất cả từ chối) ────────────────
  // Emp creator có thể cancel task của mình khi không ai nhận
  if (p.isCreator && !p.isAssignee && p.allFailed) {
    allowed.add('CANCEL');
  }

  return Array.from(allowed);
}
