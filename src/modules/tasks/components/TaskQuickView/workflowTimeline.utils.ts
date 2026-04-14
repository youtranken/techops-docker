import type { TaskStatus } from '@prisma/client';

export interface TimelineStep {
  key: TaskStatus;
  label: string;
}

export type StepState = 'done' | 'active' | 'pending';

export const IMMEDIATE_STEPS: TimelineStep[] = [
  { key: 'IN_PROGRESS',   label: 'Đang thực hiện' },
  { key: 'PENDING_REVIEW', label: 'Chờ review' },
  { key: 'COMPLETED',     label: 'Hoàn thành' },
];

export const APPROVAL_STEPS: TimelineStep[] = [
  { key: 'PENDING_APPROVAL',    label: 'Chờ duyệt' },
  { key: 'WAITING_ACKNOWLEDGE', label: 'Chờ tiếp nhận' },
  { key: 'IN_PROGRESS',         label: 'Đang thực hiện' },
  { key: 'PENDING_REVIEW',      label: 'Chờ review' },
  { key: 'COMPLETED',           label: 'Hoàn thành' },
];

const ORDER_IMMEDIATE: TaskStatus[] = ['IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'];
const ORDER_APPROVAL: TaskStatus[]  = ['PENDING_APPROVAL', 'WAITING_ACKNOWLEDGE', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'];

export function getStepState(stepKey: TaskStatus, currentStatus: TaskStatus, order: TaskStatus[]): StepState {
  if (currentStatus === 'CANCELLED') return 'pending';
  const stepIdx    = order.indexOf(stepKey);
  const currentIdx = order.indexOf(currentStatus);
  if (stepIdx < currentIdx)  return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export function getTimelineData(workflowMode: string, currentStatus: TaskStatus) {
  const steps = workflowMode === 'IMMEDIATE' ? IMMEDIATE_STEPS : APPROVAL_STEPS;
  const order = workflowMode === 'IMMEDIATE' ? ORDER_IMMEDIATE : ORDER_APPROVAL;
  return { steps, order };
}
