import { describe, it, expect } from 'vitest';
import {
  blankCreateValues, editValuesFromTask, isFormDirty, validateForm, createPayload, updatePayload,
  lockedAssignees, initialStatus, canSwitchWorkflow, type TaskFormValues, type EditSource,
} from '../form-logic';
import { v1CreatePayload, v1UpdatePayload, v1LockedLabels } from './v1-form.fixture';

// cuid hợp lệ (schema V1 kiểm assigneeIds / priorityId / typeId bằng .cuid())
const ME = 'ckme0000000000000000000001';
const U2 = 'ckus0000000000000000000002';
const U3 = 'ckus0000000000000000000003';
const PR = 'ckpr0000000000000000000001';
const PR2 = 'ckpr0000000000000000000002';
const TY = 'ckty0000000000000000000001';
const att = [{ fileName: 'a.pdf', filePath: 'misc/1_a.pdf', fileSize: 1234 }];

const base = () => blankCreateValues({ currentUserId: ME, today: '2026-10-23', priorityId: PR, typeId: TY });
const filled = (o: Partial<TaskFormValues> = {}): TaskFormValues => ({
  ...base(), title: '[E2E] Thay switch', content: '<p>Switch <b>chết</b> 6 cổng</p>', scheduleEnd: '2026-10-30', ...o,
});

describe('blankCreateValues — mặc định V1 (useCreateTaskForm)', () => {
  it('Trực tiếp, không Bắt buộc, không ★, chọn sẵn chính mình, bắt đầu hôm nay, hạn trống', () => {
    expect(base()).toEqual({
      title: '', content: '', workflowMode: 'IMMEDIATE', assigneeIds: [ME], priorityId: PR, typeId: TY,
      scheduleStart: '2026-10-23', scheduleEnd: '', isForceMode: false, isImportant: false,
    });
  });
  it('chưa có user → không chọn ai', () => {
    expect(blankCreateValues({ currentUserId: '', today: '2026-10-23', priorityId: '', typeId: '' }).assigneeIds).toEqual([]);
  });
});

describe('isFormDirty — form có thay đổi không', () => {
  it('giống hệt → không', () => expect(isFormDirty(base(), base())).toBe(false));
  it('đổi tiêu đề → có', () => expect(isFormDirty({ ...base(), title: 'x' }, base())).toBe(true));
  it('đổi ngày, ưu tiên, chế độ, ★, Bắt buộc → có', () => {
    expect(isFormDirty({ ...base(), scheduleEnd: '2026-11-01' }, base())).toBe(true);
    expect(isFormDirty({ ...base(), priorityId: PR2 }, base())).toBe(true);
    expect(isFormDirty({ ...base(), workflowMode: 'NEED_APPROVAL' }, base())).toBe(true);
    expect(isFormDirty({ ...base(), isImportant: true }, base())).toBe(true);
    expect(isFormDirty({ ...base(), isForceMode: true }, base())).toBe(true);
  });
  it('người làm chỉ đổi thứ tự → không; thêm/bớt → có', () => {
    const a = { ...base(), assigneeIds: [U2, ME] };
    expect(isFormDirty(a, { ...base(), assigneeIds: [ME, U2] })).toBe(false);
    expect(isFormDirty(a, base())).toBe(true);
  });
  it('mô tả chỉ còn thẻ rỗng (<br>, <p></p>) coi như trống', () => {
    expect(isFormDirty({ ...base(), content: '<br>' }, base())).toBe(false);
    expect(isFormDirty({ ...base(), content: '<p><br></p>' }, base())).toBe(false);
    expect(isFormDirty({ ...base(), content: '<p>a</p>' }, base())).toBe(true);
  });
  it('mô tả chỉ khác <br> cuối dòng → không', () => {
    expect(isFormDirty({ ...base(), content: '<p>a</p><br>' }, { ...base(), content: '<p>a</p>' })).toBe(false);
  });
  it('thêm tệp mới hoặc đánh dấu xoá tệp cũ → có', () => {
    expect(isFormDirty(base(), base(), { added: 1, removed: 0 })).toBe(true);
    expect(isFormDirty(base(), base(), { added: 0, removed: 1 })).toBe(true);
    expect(isFormDirty(base(), base(), { added: 0, removed: 0 })).toBe(false);
  });
});

describe('validateForm — luật V1 (create-task.schema / update-task.schema)', () => {
  it('form hợp lệ → không lỗi', () => expect(validateForm('create', filled())).toEqual({}));
  it('thiếu tiêu đề, mô tả, hạn, người làm', () => {
    const e = validateForm('create', { ...base(), assigneeIds: [] });
    expect(e.title?.key).toBe('tf.e.title');
    expect(e.content?.key).toBe('tf.e.desc');
    expect(e.scheduleEnd?.key).toBe('tf.e.due');
    expect(e.assigneeIds?.key).toBe('tf.e.people');
  });
  it('Tạo: tiêu đề tối đa 150 ký tự; Sửa: 255 (giữ đúng V1)', () => {
    expect(validateForm('create', filled({ title: 'a'.repeat(150) })).title).toBeUndefined();
    expect(validateForm('create', filled({ title: 'a'.repeat(151) })).title).toEqual({ key: 'tf.e.titleMax', values: { n: 150, x: 151 } });
    expect(validateForm('edit', filled({ title: 'a'.repeat(255) })).title).toBeUndefined();
    expect(validateForm('edit', filled({ title: 'a'.repeat(256) })).title).toEqual({ key: 'tf.e.titleMax', values: { n: 255, x: 256 } });
  });
  it('tiêu đề chỉ có khoảng trắng: V1 không trim → hợp lệ', () => {
    expect(validateForm('create', filled({ title: '   ' })).title).toBeUndefined();
  });
  it('mô tả: chỉ thẻ rỗng = trống; Tạo tối đa 5000 ký tự (tính cả HTML như V1), Sửa không giới hạn', () => {
    expect(validateForm('create', filled({ content: '<p><br></p>' })).content?.key).toBe('tf.e.desc');
    const long = `<p>${'a'.repeat(4995)}</p>`; // 5002 ký tự HTML
    expect(validateForm('create', filled({ content: long })).content).toEqual({ key: 'tf.e.descMax', values: { n: 5000, x: long.length } });
    expect(validateForm('edit', filled({ content: long })).content).toBeUndefined();
  });
  it('hạn trước ngày bắt đầu → lỗi thứ tự ngày; Tạo bắt buộc ngày bắt đầu', () => {
    expect(validateForm('create', filled({ scheduleEnd: '2026-10-20' })).scheduleEnd?.key).toBe('tf.e.dueOrder');
    expect(validateForm('edit', filled({ scheduleEnd: '2026-10-20' })).scheduleEnd?.key).toBe('tf.e.dueOrder');
    expect(validateForm('create', filled({ scheduleStart: '' })).scheduleStart?.key).toBe('tf.e.start');
  });
  it('thiếu ưu tiên / loại', () => {
    const e = validateForm('create', filled({ priorityId: '', typeId: '' }));
    expect(e.priorityId?.key).toBe('tfx.e.priority');
    expect(e.typeId?.key).toBe('tfx.e.type');
  });
});

describe('createPayload — body POST /api/tasks GIỐNG HỆT V1', () => {
  const cases: [string, TaskFormValues][] = [
    ['mặc định, giao chính mình', filled()],
    ['Phê duyệt + Bắt buộc + ★ + nhiều người', filled({ workflowMode: 'NEED_APPROVAL', isForceMode: true, isImportant: true, assigneeIds: [ME, U2, U3] })],
    ['Trực tiếp mà bật Bắt buộc (V1 vẫn gửi, server bỏ qua)', filled({ isForceMode: true, assigneeIds: [U2] })],
  ];
  for (const [name, v] of cases) {
    it(name, () => {
      const v1 = v1CreatePayload({ ...v, content: v.content.replace(/<[^>]+>/g, '').trim() }, v.content, v.assigneeIds, att);
      expect(v1).not.toBeNull();
      expect(createPayload(v, att)).toEqual(v1);
      expect(JSON.stringify(createPayload(v, []))).toBe(JSON.stringify(v1CreatePayload({ ...v }, v.content, v.assigneeIds, [])));
    });
  }
  it('không hợp lệ → null (V1 không gửi)', () => {
    expect(createPayload({ ...filled(), title: '' }, [])).toBeNull();
    expect(createPayload({ ...filled(), assigneeIds: [] }, [])).toBeNull();
  });
});

describe('Sửa — người bị khoá + body PATCH GIỐNG HỆT V1', () => {
  const task: EditSource = {
    title: '[E2E] Việc cũ', content: '<p>Mô tả cũ</p>', priority: { id: PR }, type: { id: TY },
    scheduleStart: '2026-10-20T00:00:00.000Z', scheduleEnd: '2026-10-28T00:00:00.000Z',
    isForceMode: false, isImportant: true, workflowMode: 'NEED_APPROVAL', status: 'IN_PROGRESS',
    creator: { id: ME },
    assignees: [
      { status: 'IN_PROGRESS', user: { id: U2 } },
      { status: 'PENDING', user: { id: U3 } },
      { status: 'REJECTED', user: { id: ME } },
    ],
  };
  it('editValuesFromTask = defaultValues V1', () => {
    expect(editValuesFromTask(task)).toEqual({
      title: '[E2E] Việc cũ', content: '<p>Mô tả cũ</p>', priorityId: PR, typeId: TY,
      scheduleStart: '2026-10-20', scheduleEnd: '2026-10-28', isForceMode: false, isImportant: true,
      workflowMode: 'NEED_APPROVAL', assigneeIds: [U2, U3, ME],
    });
  });
  it('lockedAssignees khớp buildLockedMap V1', () => {
    const l = lockedAssignees(task);
    expect(Object.keys(l).sort()).toEqual(Object.keys(v1LockedLabels(task)).sort());
    expect(l[ME]).toEqual(['creator']);
    expect(l[U2]).toEqual(['accepted']);
    const both = lockedAssignees({ ...task, creator: { id: U2 } });
    expect(both[U2]).toEqual(['creator', 'accepted']);
  });
  const edits: [string, Partial<TaskFormValues>, string[]][] = [
    ['không đổi ★ → bỏ isImportant', { title: '[E2E] Việc mới' }, []],
    ['tắt ★ → gửi isImportant', { isImportant: false }, ['att-1']],
    ['bỏ người chưa nhận, người đã nhận vẫn giữ', { assigneeIds: [U3] }, []],
    ['đổi hạn + Bắt buộc', { scheduleEnd: '2026-11-15', isForceMode: true }, []],
  ];
  for (const [name, change, removed] of edits) {
    it(name, () => {
      const v = { ...editValuesFromTask(task), ...change };
      const v1 = v1UpdatePayload(task, { ...v }, v.content, v.assigneeIds, att, removed);
      expect(v1).not.toBeNull();
      expect(updatePayload(task, v, att, removed)).toEqual(v1);
      expect(JSON.stringify(updatePayload(task, v, [], removed))).toBe(JSON.stringify(v1UpdatePayload(task, { ...v }, v.content, v.assigneeIds, [], removed)));
    });
  }
  it('không hợp lệ → null', () => {
    expect(updatePayload(task, { ...editValuesFromTask(task), title: '' }, [], [])).toBeNull();
  });
});

describe('initialStatus — resolveInitialStatus V1 (dòng tóm tắt)', () => {
  it('Trực tiếp: chỉ mình → Đang làm; có người khác → Chờ nhận việc', () => {
    expect(initialStatus('EMPLOYEE', 'IMMEDIATE', [ME], ME)).toBe('IN_PROGRESS');
    expect(initialStatus('BOSS', 'IMMEDIATE', [ME, U2], ME)).toBe('WAITING_ACKNOWLEDGE');
  });
  it('Phê duyệt: nhân viên → Chờ duyệt; Boss/Admin → Chờ nhận việc', () => {
    expect(initialStatus('EMPLOYEE', 'NEED_APPROVAL', [ME], ME)).toBe('PENDING_APPROVAL');
    expect(initialStatus('BOSS', 'NEED_APPROVAL', [ME], ME)).toBe('WAITING_ACKNOWLEDGE');
    expect(initialStatus('ADMIN', 'NEED_APPROVAL', [U2], ME)).toBe('WAITING_ACKNOWLEDGE');
  });
  it('chưa chọn ai → null', () => expect(initialStatus('BOSS', 'IMMEDIATE', [], ME)).toBeNull());
});

describe('canSwitchWorkflow — V1 EditTaskSheet: chỉ nhân viên, việc Chờ duyệt', () => {
  it('đúng V1', () => {
    expect(canSwitchWorkflow(false, 'PENDING_APPROVAL')).toBe(true);
    expect(canSwitchWorkflow(true, 'PENDING_APPROVAL')).toBe(false);
    expect(canSwitchWorkflow(false, 'IN_PROGRESS')).toBe(false);
  });
});
