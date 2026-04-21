/**
 * task-workflow.service.ts — Facade re-export
 *
 * File này chỉ re-export từ các sub-services theo domain.
 * Logic thực tế nằm trong workflow/:
 *   - workflow/acknowledge.service.ts  (~63 lines)
 *   - workflow/approval.service.ts     (~212 lines)
 *   - workflow/lifecycle.service.ts    (~185 lines)
 *   - workflow/assignment.service.ts   (~263 lines)
 *   - workflow/_shared.ts              (~127 lines)
 */

export { acknowledge } from './workflow/acknowledge.service';
export { approvePlan, rejectPlan, approveReview, rejectReview } from './workflow/approval.service';
export { complete, cancel } from './workflow/lifecycle.service';
export { transfer, rejectTask, reassign } from './workflow/assignment.service';
export { restoreCancelled } from './workflow/restore.service';

// Re-export shared types for consumers that import from this module
export type { SessionUser, CompleteData, RejectData, TransferData, ReassignData } from './workflow/_shared';
export { WorkflowError } from './workflow/_shared';

// ── Object facade — API routes không cần thay đổi import ──────────────────────
import { acknowledge } from './workflow/acknowledge.service';
import { approvePlan, rejectPlan, approveReview, rejectReview } from './workflow/approval.service';
import { complete, cancel } from './workflow/lifecycle.service';
import { transfer, rejectTask, reassign } from './workflow/assignment.service';
import { restoreCancelled } from './workflow/restore.service';

export const taskWorkflowService = {
  acknowledge,
  approvePlan,
  rejectPlan,
  approveReview,
  rejectReview,
  complete,
  cancel,
  transfer,
  rejectTask,
  reassign,
  restoreCancelled,
};
