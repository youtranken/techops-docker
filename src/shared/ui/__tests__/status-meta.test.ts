import { describe, it, expect } from 'vitest';
import { translator } from '@/test/translator';
import { TaskStatus, AssigneeStatus } from '@prisma/client';
import {
  TASK_STATUS_META,
  ASSIGNEE_STATUS_META,
  taskStatusMeta,
  assigneeStatusMeta,
  priorityTone,
  PRIORITY_TONE_META,
  metaLabel,
  type StatusMeta,
} from '../status-meta';

// Nhãn giờ lấy từ messages/*.json qua khoá (A1.3) → kiểm bằng translator thật của next-intl
const tVi = translator('vi');
const tEn = translator('en');
const vi = (m: StatusMeta) => metaLabel(m, tVi);
const en = (m: StatusMeta) => metaLabel(m, tEn);

describe('TASK_STATUS_META', () => {
  it('phủ đủ mọi giá trị enum TaskStatus', () => {
    expect(Object.keys(TASK_STATUS_META).sort()).toEqual(Object.values(TaskStatus).sort());
  });
  it('nhãn tiếng Việt như preview', () => {
    expect(vi(TASK_STATUS_META.DRAFT)).toBe('Nháp');
    expect(vi(TASK_STATUS_META.PENDING_APPROVAL)).toBe('Chờ duyệt');
    expect(vi(TASK_STATUS_META.WAITING_ACKNOWLEDGE)).toBe('Chờ nhận việc');
    expect(vi(TASK_STATUS_META.IN_PROGRESS)).toBe('Đang làm');
    expect(vi(TASK_STATUS_META.PENDING_REVIEW)).toBe('Chờ nghiệm thu');
    expect(vi(TASK_STATUS_META.COMPLETED)).toBe('Đã xong');
    expect(vi(TASK_STATUS_META.CANCELLED)).toBe('Đã hủy');
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
    expect(vi(taskStatusMeta('XYZ'))).toBe('XYZ');
    expect(taskStatusMeta('XYZ').labelKey).toBeNull();
  });
});

describe('ASSIGNEE_STATUS_META', () => {
  it('phủ đủ mọi giá trị enum AssigneeStatus', () => {
    expect(Object.keys(ASSIGNEE_STATUS_META).sort()).toEqual(Object.values(AssigneeStatus).sort());
  });
  it('nhãn theo V1 (preview _SPEC mục 8)', () => {
    expect(vi(ASSIGNEE_STATUS_META.PENDING)).toBe('Chờ nhận');
    expect(vi(ASSIGNEE_STATUS_META.IN_PROGRESS)).toBe('Đang làm');
    expect(vi(ASSIGNEE_STATUS_META.COMPLETED)).toBe('Đã báo cáo');
    expect(vi(ASSIGNEE_STATUS_META.REJECTED)).toBe('Từ chối');
    expect(vi(ASSIGNEE_STATUS_META.TRANSFERRED)).toBe('Đã chuyển giao');
    expect(vi(ASSIGNEE_STATUS_META.REVISION_REQUIRED)).toBe('Cần làm lại');
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
    expect(en(assigneeStatusMeta('ABC'))).toBe('ABC');
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
    expect(PRIORITY_TONE_META.urgent).toMatchObject({ labelKey: 'pr.urgent', color: 'var(--danger)' });
    expect(PRIORITY_TONE_META.high).toMatchObject({ labelKey: 'pr.high', color: 'var(--c-review)' });
    expect(PRIORITY_TONE_META.normal).toMatchObject({ labelKey: 'pr.normal', color: 'var(--ink-3)' });
    expect(PRIORITY_TONE_META.low).toMatchObject({ labelKey: 'pr.low', color: 'var(--ink-3)' });
    expect(vi(PRIORITY_TONE_META.urgent)).toBe('Khẩn');
    expect(en(PRIORITY_TONE_META.urgent)).toBe('Urgent');
  });
});

describe('khoá nhãn (A1.3)', () => {
  it('trạng thái việc dùng khoá st.*, người làm td.as.*, ưu tiên pr.*', () => {
    expect(TASK_STATUS_META.PENDING_APPROVAL.labelKey).toBe('st.PENDING_APPROVAL');
    expect(ASSIGNEE_STATUS_META.REVISION_REQUIRED.labelKey).toBe('td.as.REVISION_REQUIRED');
    expect(ASSIGNEE_STATUS_META.ACKNOWLEDGED.labelKey).toBe('td.as.ACCEPTED');
  });
  it('mọi khoá đều có trong vi.json và en.json (không hiện tên khoá)', () => {
    const metas = [...Object.values(TASK_STATUS_META), ...Object.values(ASSIGNEE_STATUS_META), ...Object.values(PRIORITY_TONE_META)];
    for (const m of metas) {
      expect(tVi.has(m.labelKey!)).toBe(true);
      expect(tEn.has(m.labelKey!)).toBe(true);
    }
  });
  it('nhãn tiếng Anh', () => {
    expect(en(TASK_STATUS_META.PENDING_APPROVAL)).toBe('Awaiting approval');
    expect(en(TASK_STATUS_META.COMPLETED)).toBe('Done');
    expect(en(ASSIGNEE_STATUS_META.TRANSFERRED)).toBe('Handed over');
  });
});
