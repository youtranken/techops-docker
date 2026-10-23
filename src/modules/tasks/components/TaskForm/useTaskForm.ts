'use client';

/**
 * Trạng thái + hành vi biểu mẫu Tạo / Sửa công việc V2 (dùng chung cho ngăn trượt và trang đầy đủ).
 * Nghiệp vụ V1: mặc định, kiểm tra, tải tệp lên (`/api/upload` từng tệp, như V1), body API — nằm ở `form-logic.ts`.
 * Nháp: chỉ localStorage (`draft-store.ts`), chỉ ở chế độ Tạo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCreateTask } from '../../hooks/useCreateTask';
import { useUpdateTask } from '../../hooks/useUpdateTask';
import { usePriorities } from '@/modules/settings/hooks/usePriorities';
import { useTaskTypes } from '@/modules/settings/hooks/useTaskTypes';
import type { TaskDetail } from '../../services/task-query.service';
import type { FileEntry } from '../../actions/components/modals/AttachmentField';
import type { CreateTaskInput } from '../../validators/create-task.schema';
import {
  blankCreateValues, editValuesFromTask, isFormDirty, validateForm, createPayload, updatePayload, todayIso,
  type FormErrors, type FormMode, type TaskFormValues, type UploadedAttachment,
} from './form-logic';
import { getDraft, removeDraft, saveDraft as storeDraft, type TaskDraft } from './draft-store';
import { notifyDrafts } from './useDrafts';
import type { FormHandoff } from './handoff';

export interface CreatedTask { id: string; taskCode: string | null; status: string; title: string }

export interface UseTaskFormOptions {
  mode: FormMode;
  task?: TaskDetail | null;
  /** Mở nháp có sẵn (chỉ Tạo) */
  draftId?: string | null;
  /** Dữ liệu chuyển từ ngăn trượt sang trang đầy đủ */
  handoff?: FormHandoff | null;
}

async function uploadFile(file: File, task?: { id: string }): Promise<UploadedAttachment> {
  const fd = new FormData();
  fd.append('file', file);
  if (task) {
    // V1 Sửa: tải thẳng vào thư mục <taskId>/attachments/
    fd.append('taskId', task.id);
    fd.append('subFolder', 'attachments');
  }
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Upload thất bại: ${file.name}`);
  }
  const data = await res.json();
  return { fileName: file.name, filePath: data.filePath, fileSize: file.size };
}

export function useTaskForm({ mode, task, draftId: draftIdProp, handoff }: UseTaskFormOptions) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const role = session?.user?.role?.name ?? '';
  const isBossOrAdmin = role === 'BOSS' || role === 'ADMIN';
  const { data: priorities = [] } = usePriorities();
  const { data: taskTypes = [] } = useTaskTypes();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // V1: mặc định "Bình thường" / "Phần mềm"
  const defaultPriorityId = priorities.find((p) => p.name === 'Bình thường')?.id ?? '';
  const defaultTypeId = taskTypes.find((t) => t.name === 'Phần mềm')?.id ?? '';

  const [draft] = useState<TaskDraft | null>(() =>
    mode === 'create' && !handoff && draftIdProp && currentUserId ? getDraft(currentUserId, draftIdProp) : null);
  const [draftId, setDraftId] = useState<string | null>(() => handoff?.draftId ?? draft?.id ?? null);
  const draftMissing = mode === 'create' && !handoff && !!draftIdProp && !draft;

  const initial = useMemo<{ values: TaskFormValues; base: TaskFormValues; fromBlank: boolean }>(() => {
    if (mode === 'edit' && task) { const v = editValuesFromTask(task); return { values: v, base: v, fromBlank: false }; }
    if (handoff) return { values: handoff.values, base: handoff.base, fromBlank: false };
    if (draft) return { values: draft.f, base: draft.f, fromBlank: false };
    const b = blankCreateValues({ currentUserId, today: todayIso(), priorityId: defaultPriorityId, typeId: defaultTypeId });
    return { values: b, base: b, fromBlank: true };
    // chỉ tính lần đầu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [values, setValues] = useState<TaskFormValues>(initial.values);
  const [base, setBase] = useState<TaskFormValues>(initial.base);
  const [files, setFiles] = useState<FileEntry[]>(handoff?.files ?? []);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);

  // V1: mặc định ưu tiên/loại/người làm nạp sau (API) → điền vào form trống (cả mốc so sánh "có thay đổi")
  const fromBlank = useRef(initial.fromBlank);
  useEffect(() => {
    if (!fromBlank.current) return;
    const fill = (v: TaskFormValues): TaskFormValues => ({
      ...v,
      priorityId: v.priorityId || defaultPriorityId,
      typeId: v.typeId || defaultTypeId,
      assigneeIds: v.assigneeIds.length === 0 && currentUserId ? [currentUserId] : v.assigneeIds,
    });
    setValues((v) => fill(v));
    setBase((b) => fill(b));
  }, [defaultPriorityId, defaultTypeId, currentUserId]);

  const set = useCallback((patch: Partial<TaskFormValues>) => setValues((v) => ({ ...v, ...patch })), []);

  const dirty = isFormDirty(values, base, { added: files.length, removed: removedIds.length });
  const errors: FormErrors = tried ? validateForm(mode, values) : {};
  const pending = uploading || createTask.isPending || updateTask.isPending;

  const toggleRemoved = useCallback((id: string) =>
    setRemovedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])), []);

  /** Gửi form. Trả về: 'invalid' (có lỗi) · 'error' (lỗi máy chủ) · kết quả khi thành công. */
  async function submit(): Promise<
    | { ok: false; reason: 'invalid'; errors: FormErrors }
    | { ok: false; reason: 'error' }
    | { ok: true; created?: CreatedTask }
  > {
    setTried(true);
    setServerError(null);
    const errs = validateForm(mode, values);
    if (Object.keys(errs).length) return { ok: false, reason: 'invalid', errors: errs };
    setUploading(true);
    try {
      const uploaded: UploadedAttachment[] = [];
      for (const f of files) if (f._file) uploaded.push(await uploadFile(f._file, mode === 'edit' && task ? task : undefined));
      setUploading(false);
      if (mode === 'edit' && task) {
        const body = updatePayload(task, values, uploaded, removedIds);
        if (!body) return { ok: false, reason: 'invalid', errors: validateForm(mode, values) };
        await updateTask.mutateAsync({ id: task.id, data: body });
        setBase(values);
        setFiles([]);
        setRemovedIds([]);
        return { ok: true };
      }
      const body = createPayload(values, uploaded);
      if (!body) return { ok: false, reason: 'invalid', errors: validateForm(mode, values) };
      const created = (await createTask.mutateAsync(body as CreateTaskInput & { attachments: UploadedAttachment[] })) as CreatedTask;
      // Tạo thành công từ nháp → xoá nháp
      if (draftId) { removeDraft(currentUserId, draftId); setDraftId(null); notifyDrafts(); }
      setBase(values);
      setFiles([]);
      return { ok: true, created };
    } catch (err) {
      setUploading(false);
      setServerError(err);
      return { ok: false, reason: 'error' };
    }
  }

  /** Lưu nháp (chỉ Tạo): không kiểm tra, không gọi API, không lưu tệp. */
  function saveAsDraft(): TaskDraft | null {
    if (mode !== 'create') return null;
    const d = storeDraft(currentUserId, values, { id: draftId });
    if (!d) return null;
    setDraftId(d.id);
    setBase(values);
    notifyDrafts();
    return d;
  }

  function deleteDraft() {
    if (!draftId) return;
    removeDraft(currentUserId, draftId);
    setDraftId(null);
    notifyDrafts();
  }

  return {
    mode, task: task ?? null, values, base, set, files, setFiles, removedIds, toggleRemoved,
    dirty, tried, errors, serverError, pending, submit, saveAsDraft, deleteDraft,
    draftId, draftMissing, currentUserId, role, isBossOrAdmin, priorities, taskTypes,
  };
}

export type TaskFormModel = ReturnType<typeof useTaskForm>;
