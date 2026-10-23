/**
 * Logic thuần của biểu mẫu Tạo / Sửa công việc V2 (A2-4b). Không phụ thuộc React → test được.
 *
 * NGHIỆP VỤ GIỮ NGUYÊN V1 (đối chiếu `__tests__/v1-form.fixture.ts`):
 * - Mặc định khi tạo = `CreateTask/useCreateTaskForm.ts` (Trực tiếp, chọn sẵn chính mình, bắt đầu hôm nay theo UTC).
 * - Luật kiểm tra = zod `create-task.schema.ts` (Tạo: tiêu đề ≤150, mô tả ≤5000 tính cả HTML) và
 *   `update-task.schema.ts` (Sửa: tiêu đề ≤255) — chạy CHÍNH các schema đó, chỉ đổi chữ báo lỗi sang khoá i18n.
 * - Body POST/PATCH giống hệt V1 (cách lấy nội dung HTML, lọc người làm, giữ người đã nhận việc, bỏ ★ không đổi).
 */
import type { TaskStatus } from '@prisma/client';
import { createTaskSchema } from '../../validators/create-task.schema';
import { updateTaskSchema } from '../../validators/update-task.schema';
import type { DraftFields } from './draft-store';

export type TaskFormValues = DraftFields;
export type FormMode = 'create' | 'edit';
export type FieldKey = 'title' | 'content' | 'assigneeIds' | 'priorityId' | 'typeId' | 'scheduleStart' | 'scheduleEnd';
export interface Msg { key: string; values?: Record<string, number | string> }
export type FormErrors = Partial<Record<FieldKey, Msg>>;
export interface UploadedAttachment { fileName: string; filePath: string; fileSize: number }

/** Thứ tự ô để đưa focus tới lỗi đầu tiên */
export const FIELD_ORDER: FieldKey[] = ['title', 'content', 'assigneeIds', 'typeId', 'priorityId', 'scheduleStart', 'scheduleEnd'];

/** Việc cần sửa — phần `TaskDetail` mà form dùng */
export interface EditSource {
  title: string;
  content: string | null;
  priority: { id: string };
  type: { id: string };
  scheduleStart: string | Date;
  scheduleEnd: string | Date;
  isForceMode: boolean;
  isImportant: boolean;
  workflowMode: string;
  status: string;
  creator: { id: string };
  assignees: { status: string; user: { id: string } }[];
}

/** V1: `html.replace(/<[^>]+>/g, '').trim()` */
export const plainText = (html: string) => (html ?? '').replace(/<[^>]+>/g, '').trim();
export const hasText = (html: string) => !!plainText(html);

/** V1 `today()` = ngày UTC */
export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

export function blankCreateValues(o: { currentUserId: string; today: string; priorityId: string; typeId: string }): TaskFormValues {
  return {
    title: '',
    content: '',
    workflowMode: 'IMMEDIATE',
    assigneeIds: o.currentUserId ? [o.currentUserId] : [],
    priorityId: o.priorityId,
    typeId: o.typeId,
    scheduleStart: o.today,
    scheduleEnd: '',
    isForceMode: false,
    isImportant: false,
  };
}

const isoDay = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

/** defaultValues của V1 useEditTaskForm + assigneeIds ban đầu (mọi người làm, kể cả đã từ chối/chuyển giao). */
export function editValuesFromTask(t: EditSource): TaskFormValues {
  return {
    title: t.title,
    content: t.content ?? '',
    priorityId: t.priority.id,
    typeId: t.type.id,
    scheduleStart: isoDay(t.scheduleStart),
    scheduleEnd: isoDay(t.scheduleEnd),
    isForceMode: t.isForceMode,
    isImportant: t.isImportant,
    workflowMode: t.workflowMode === 'NEED_APPROVAL' ? 'NEED_APPROVAL' : 'IMMEDIATE',
    assigneeIds: t.assignees.map((a) => a.user.id),
  };
}

function snapshot(v: TaskFormValues) {
  return JSON.stringify({
    ...v,
    content: hasText(v.content) ? v.content.replace(/(<br\s*\/?>)+$/i, '') : '',
    assigneeIds: [...v.assigneeIds].sort(),
  });
}

/** Có thay đổi so với lúc mở (để hỏi khi đóng). Tệp tính riêng: thêm mới / đánh dấu xoá. */
export function isFormDirty(cur: TaskFormValues, base: TaskFormValues, files?: { added: number; removed: number }): boolean {
  if (files && (files.added > 0 || files.removed > 0)) return true;
  return snapshot(cur) !== snapshot(base);
}

/** Giá trị đưa vào zod — đúng như V1 handleSubmitClick: nội dung = HTML nếu có chữ, người làm lọc rỗng. */
function schemaInput(v: TaskFormValues) {
  return { ...v, content: hasText(v.content) ? v.content : '', assigneeIds: v.assigneeIds.filter(Boolean) };
}

function toMsg(field: FieldKey, code: string, v: TaskFormValues, maxTitle: number): Msg {
  switch (field) {
    case 'title':
      return code === 'too_big' ? { key: 'tf.e.titleMax', values: { n: maxTitle, x: v.title.length } } : { key: 'tf.e.title' };
    case 'content': {
      const html = schemaInput(v).content;
      return code === 'too_big' ? { key: 'tf.e.descMax', values: { n: 5000, x: html.length } } : { key: 'tf.e.desc' };
    }
    case 'assigneeIds': return { key: 'tf.e.people' };
    case 'priorityId': return { key: 'tfx.e.priority' };
    case 'typeId': return { key: 'tfx.e.type' };
    case 'scheduleStart': return { key: 'tf.e.start' };
    case 'scheduleEnd': return code === 'custom' ? { key: 'tf.e.dueOrder' } : { key: 'tf.e.due' };
  }
}

export function validateForm(mode: FormMode, v: TaskFormValues): FormErrors {
  const res = (mode === 'create' ? createTaskSchema : updateTaskSchema).safeParse(schemaInput(v));
  if (res.success) return {};
  const out: FormErrors = {};
  for (const issue of res.error.issues) {
    const f = issue.path[0] as FieldKey;
    if (!FIELD_ORDER.includes(f) || out[f]) continue;
    out[f] = toMsg(f, issue.code, v, mode === 'create' ? 150 : 255);
  }
  return out;
}

/** Body POST /api/tasks — như V1 onSubmit: `{ ...values, assigneeIds, content, attachments }`. null = không hợp lệ. */
export function createPayload(v: TaskFormValues, attachments: UploadedAttachment[]) {
  const parsed = createTaskSchema.safeParse(schemaInput(v));
  if (!parsed.success) return null;
  const valid = v.assigneeIds.filter(Boolean);
  if (!valid.length) return null;
  const content = hasText(v.content) ? v.content : parsed.data.content;
  return { ...parsed.data, assigneeIds: valid, content, attachments };
}

const ACKNOWLEDGED = ['IN_PROGRESS', 'COMPLETED', 'REVISION_REQUIRED', 'TRANSFERRED'];
export type LockKind = 'creator' | 'accepted';
/** V1 buildLockedMap: người tạo + người đã tiếp nhận → không bỏ chọn được khi Sửa. */
export function lockedAssignees(t: EditSource): Record<string, LockKind[]> {
  const out: Record<string, LockKind[]> = { [t.creator.id]: ['creator'] };
  for (const a of t.assignees) {
    if (ACKNOWLEDGED.includes(a.status)) out[a.user.id] = [...(out[a.user.id] ?? []), 'accepted'];
  }
  return out;
}

/** V1 omitUnchangedImportant: ★ dùng chung — chỉ gửi khi người dùng thật sự đổi trong form. */
export function omitUnchangedImportant<T extends { isImportant?: boolean }>(values: T, initialIsImportant: boolean): T {
  if (values.isImportant === undefined || values.isImportant !== initialIsImportant) return values;
  const { isImportant: _unchanged, ...rest } = values;
  return rest as T;
}

/** Body PATCH /api/tasks/:id — như V1 useEditTaskForm.onSubmit. null = không hợp lệ. */
export function updatePayload(t: EditSource, v: TaskFormValues, attachmentsToAdd: UploadedAttachment[], removedIds: string[]) {
  const parsed = updateTaskSchema.safeParse(schemaInput(v));
  if (!parsed.success) return null;
  const lockedIds = Object.keys(lockedAssignees(t));
  const finalIds = Array.from(new Set([
    ...lockedIds.filter((id) => t.assignees.some((a) => a.user.id === id)),
    ...v.assigneeIds,
  ]));
  const content = hasText(v.content) ? v.content : parsed.data.content;
  return {
    ...omitUnchangedImportant(parsed.data, t.isImportant),
    assigneeIds: finalIds,
    content,
    attachmentsToAdd: attachmentsToAdd.length ? attachmentsToAdd : undefined,
    attachmentsToRemove: removedIds.length ? removedIds : undefined,
  };
}

/** Bản sao `resolveInitialStatus` (task-create.service.ts) — chỉ để hiện dòng "Bắt đầu ở …". */
export function initialStatus(role: string, mode: string, assigneeIds: string[], me: string): TaskStatus | null {
  const ids = assigneeIds.filter(Boolean);
  if (!ids.length) return null;
  const selfOnly = ids.length === 1 && ids[0] === me;
  if (mode === 'IMMEDIATE') return selfOnly ? 'IN_PROGRESS' : 'WAITING_ACKNOWLEDGE';
  return role === 'BOSS' || role === 'ADMIN' ? 'WAITING_ACKNOWLEDGE' : 'PENDING_APPROVAL';
}

/** V1 EditTaskSheet: ô Chế độ chỉ đổi được khi KHÔNG phải Boss/Admin và việc đang Chờ duyệt. */
export const canSwitchWorkflow = (isBossOrAdmin: boolean, status: string) => !isBossOrAdmin && status === 'PENDING_APPROVAL';
