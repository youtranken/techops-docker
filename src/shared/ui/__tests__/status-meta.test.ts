import { describe, it, expect } from 'vitest';
import { TaskStatus, AssigneeStatus } from '@prisma/client';
import {
  TASK_STATUS_META,
  ASSIGNEE_STATUS_META,
  taskStatusMeta,
  assigneeStatusMeta,
  priorityTone,
  PRIORITY_TONE_META,
} from '../status-meta';

describe('TASK_STATUS_META', () => {
  it('phủ đủ mọi giá trị enum TaskStatus', () => {
    expect(Object.keys(TASK_STATUS_META).sort()).toEqual(Object.values(TaskStatus).sort());
  });
  it('nhãn tiếng Việt như preview', () => {
    expect(TASK_STATUS_META.DRAFT.label).toBe('Nháp');
    expect(TASK_STATUS_META.PENDING_APPROVAL.label).toBe('Chờ duyệt');
    expect(TASK_STATUS_META.WAITING_ACKNOWLEDGE.label).toBe('Chờ nhận việc');
    expect(TASK_STATUS_META.IN_PROGRESS.label).toBe('Đang làm');
    expect(TASK_STATUS_META.PENDING_REVIEW.label).toBe('Chờ nghiệm thu');
    expect(TASK_STATUS_META.COMPLETED.label).toBe('Đã xong');
    expect(TASK_STATUS_META.CANCELLED.label).toBe('Đã hủy');
  });
  it('màu theo token --c-*', () => {
    expect(TASK_STATUS_META.PENDING_APPROVAL.color).toBe('var(--c-approval)');
    expect(TASK_STATUS_META.WAITING_ACKNOWLEDGE.color).toBe('var(--c-pickup)');
    expect(TASK_STATUS_META.IN_PROGRESS.color).toBe('var(--c-progress)');
    expect(TASK_STATUS_META.PENDING_REVIEW.color).toBe('var(--c-review)');
    expect(TASK_STATUS_META.COMPLETED.color).toBe('var(--c-done)');
    expect(TASK_STATUS_META.CANCELLED.color).toBe('var(--ink-3)');
  });
  it('taskStatusMeta: giá trị lạ không làm vỡ giao diện', () => {
    expect(taskStatusMeta('XYZ').label).toBe('XYZ');
  });
});

describe('ASSIGNEE_STATUS_META', () => {
  it('phủ đủ mọi giá trị enum AssigneeStatus', () => {
    expect(Object.keys(ASSIGNEE_STATUS_META).sort()).toEqual(Object.values(AssigneeStatus).sort());
  });
  it('nhãn theo V1 (preview _SPEC mục 8)', () => {
    expect(ASSIGNEE_STATUS_META.PENDING.label).toBe('Chờ nhận');
    expect(ASSIGNEE_STATUS_META.IN_PROGRESS.label).toBe('Đang làm');
    expect(ASSIGNEE_STATUS_META.COMPLETED.label).toBe('Đã báo cáo');
    expect(ASSIGNEE_STATUS_META.REJECTED.label).toBe('Từ chối');
    expect(ASSIGNEE_STATUS_META.TRANSFERRED.label).toBe('Đã chuyển giao');
    expect(ASSIGNEE_STATUS_META.REVISION_REQUIRED.label).toBe('Cần làm lại');
  });
  it('chấm rỗng cho Chờ nhận và Đã chuyển giao', () => {
    expect(ASSIGNEE_STATUS_META.PENDING.hollow).toBe(true);
    expect(ASSIGNEE_STATUS_META.TRANSFERRED.hollow).toBe(true);
    expect(ASSIGNEE_STATUS_META.IN_PROGRESS.hollow).toBeFalsy();
  });
  it('màu: Từ chối đỏ, Cần làm lại cam, Đã báo cáo xanh lá', () => {
    expect(ASSIGNEE_STATUS_META.REJECTED.color).toBe('var(--danger)');
    expect(ASSIGNEE_STATUS_META.REVISION_REQUIRED.color).toBe('var(--c-review)');
    expect(ASSIGNEE_STATUS_META.COMPLETED.color).toBe('var(--c-done)');
  });
  it('assigneeStatusMeta: giá trị lạ không làm vỡ giao diện', () => {
    expect(assigneeStatusMeta('ABC').label).toBe('ABC');
  });
});

describe('priorityTone (theo level của bảng Priority)', () => {
  it('level 4+ → urgent, 3 → high, 2 → normal, ≤1 → low', () => {
    expect(priorityTone(4)).toBe('urgent');
    expect(priorityTone(7)).toBe('urgent');
    expect(priorityTone(3)).toBe('high');
    expect(priorityTone(2)).toBe('normal');
    expect(priorityTone(1)).toBe('low');
    expect(priorityTone(0)).toBe('low');
  });
  it('thiếu level → normal', () => {
    expect(priorityTone(undefined)).toBe('normal');
    expect(priorityTone(null)).toBe('normal');
  });
  it('meta: nhãn mặc định + màu', () => {
    expect(PRIORITY_TONE_META.urgent).toMatchObject({ label: 'Khẩn', color: 'var(--danger)' });
    expect(PRIORITY_TONE_META.high).toMatchObject({ label: 'Cao', color: 'var(--c-review)' });
    expect(PRIORITY_TONE_META.normal).toMatchObject({ label: 'Thường', color: 'var(--ink-3)' });
    expect(PRIORITY_TONE_META.low).toMatchObject({ label: 'Thấp', color: 'var(--ink-3)' });
  });
});
