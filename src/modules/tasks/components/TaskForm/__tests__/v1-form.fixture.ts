/** BẢN SAO logic V1 (trước A2-4b) — mốc đối chiếu cho test biểu mẫu Tạo/Sửa V2. Không dùng trong code chạy.
 *  - `v1CreatePayload`: `CreateTask/useCreateTaskForm.ts` — handleSubmitClick → zod (createTaskSchema) → onSubmit → body POST /api/tasks.
 *  - `v1UpdatePayload`: `TaskModals/EditTask/useEditTaskForm.ts` — handleSubmitClick → zod (updateTaskSchema) → onSubmit → body PATCH /api/tasks/:id.
 *  - `v1LockedLabels`: `buildLockedMap` của useEditTaskForm (người không gỡ được khỏi việc khi Sửa).
 *  Trạng thái react-hook-form được mô phỏng bằng object `rhf` (giá trị form lúc bấm nút).
 */
import { createTaskSchema } from '../../../validators/create-task.schema';
import { updateTaskSchema } from '../../../validators/update-task.schema';

type Att = { fileName: string; filePath: string; fileSize: number };

/** V1 omitUnchangedImportant (TaskModals/EditTask/edit-payload.ts) */
function omitUnchangedImportant<T extends { isImportant?: boolean }>(values: T, initialIsImportant: boolean): T {
  if (values.isImportant === undefined || values.isImportant !== initialIsImportant) return values;
  const { isImportant: _unchanged, ...rest } = values;
  return rest as T;
}

export function v1CreatePayload(
  rhf: Record<string, unknown>,
  richContent: string,
  assigneeIds: string[],
  uploadedAttachments: Att[],
): Record<string, unknown> | null {
  // handleSubmitClick
  const values: Record<string, unknown> = { ...rhf };
  if (richContent.replace(/<[^>]+>/g, '').trim()) values.content = richContent;
  values.assigneeIds = assigneeIds.filter(Boolean);
  const parsed = createTaskSchema.safeParse(values);
  if (!parsed.success) return null;
  // onSubmit
  const valid = assigneeIds.filter(Boolean);
  if (valid.length === 0) return null;
  const content = richContent.replace(/<[^>]+>/g, '').trim() ? richContent : parsed.data.content;
  return { ...parsed.data, assigneeIds: valid, content, attachments: uploadedAttachments };
}

export interface V1EditTask {
  isImportant: boolean;
  creator: { id: string };
  assignees: { status: string; user: { id: string } }[];
}

const ACKNOWLEDGED = ['IN_PROGRESS', 'COMPLETED', 'REVISION_REQUIRED', 'TRANSFERRED'];
export function v1LockedLabels(task: V1EditTask) {
  const labels: Record<string, string> = { [task.creator.id]: 'người tạo' };
  task.assignees.forEach((a) => {
    if (ACKNOWLEDGED.includes(a.status)) {
      const e = labels[a.user.id];
      labels[a.user.id] = e ? `${e}, đã tiếp nhận` : 'đã tiếp nhận';
    }
  });
  return labels;
}

export function v1UpdatePayload(
  task: V1EditTask,
  rhf: Record<string, unknown>,
  richContent: string,
  assigneeIds: string[],
  attachmentsToAdd: Att[],
  removedIds: string[],
): Record<string, unknown> | null {
  const values: Record<string, unknown> = { ...rhf };
  if (richContent.replace(/<[^>]+>/g, '').trim()) values.content = richContent;
  values.assigneeIds = assigneeIds.filter(Boolean);
  const parsed = updateTaskSchema.safeParse(values);
  if (!parsed.success) return null;
  const lockedIds = Object.keys(v1LockedLabels(task));
  const finalIds = Array.from(new Set([
    ...lockedIds.filter((id) => task.assignees.some((a) => a.user.id === id)),
    ...assigneeIds,
  ]));
  const content = richContent.replace(/<[^>]+>/g, '').trim() ? richContent : parsed.data.content;
  return {
    ...omitUnchangedImportant(parsed.data, task.isImportant),
    assigneeIds: finalIds,
    content,
    attachmentsToAdd: attachmentsToAdd.length ? attachmentsToAdd : undefined,
    attachmentsToRemove: removedIds.length ? removedIds : undefined,
  };
}
