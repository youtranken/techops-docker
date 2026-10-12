'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { omitUnchangedImportant } from './edit-payload';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { useUpdateTask } from '../../../hooks/useUpdateTask';
import { usePriorities } from '@/modules/settings/hooks/usePriorities';
import { useTaskTypes } from '@/modules/settings/hooks/useTaskTypes';
import { updateTaskSchema, type UpdateTaskInput } from '../../../validators/update-task.schema';
import type { TaskDetail } from '../../../services/task-query.service';

const ACKNOWLEDGED = ['IN_PROGRESS', 'COMPLETED', 'REVISION_REQUIRED', 'TRANSFERRED'];

function buildLockedMap(task: TaskDetail) {
  const labels: Record<string, string> = { [task.creator.id]: 'người tạo' };
  task.assignees.forEach((a) => {
    if (ACKNOWLEDGED.includes(a.status)) {
      const e = labels[a.user.id];
      labels[a.user.id] = e ? `${e}, đã tiếp nhận` : 'đã tiếp nhận';
    }
  });
  return labels;
}

export function useEditTaskForm(task: TaskDetail, onClose: () => void) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const isBossOrAdmin = ['BOSS', 'ADMIN'].includes(session?.user?.role?.name ?? '');

  const updateTask = useUpdateTask();
  const { data: priorities = [] } = usePriorities();
  const { data: taskTypes = [] } = useTaskTypes();

  const lockedLabels = buildLockedMap(task);
  const lockedIds = Object.keys(lockedLabels);

  const [serverError,    setServerError]    = useState<string | null>(null);
  const [richContent,    setRichContent]    = useState(task.content ?? '');
  const [assigneeIds,    setAssigneeIds]    = useState<string[]>(task.assignees.map((a) => a.user.id));
  const [assigneeTouched, setAssigneeTouched] = useState(false);
  const [newFiles,       setNewFiles]       = useState<File[]>([]);
  const [removedIds,     setRemovedIds]     = useState<string[]>([]);

  const form = useForm<UpdateTaskInput>({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      title:         task.title,
      content:       task.content ?? '',
      priorityId:    task.priority.id,
      typeId:        task.type.id,
      scheduleStart: new Date(task.scheduleStart).toISOString().slice(0, 10),
      scheduleEnd:   new Date(task.scheduleEnd).toISOString().slice(0, 10),
      isForceMode:   task.isForceMode,
      isImportant:   task.isImportant,
      workflowMode:  task.workflowMode as 'IMMEDIATE' | 'NEED_APPROVAL',
    },
  });

  const { setValue, handleSubmit } = form;

  async function onSubmit(values: UpdateTaskInput) {
    const finalIds = Array.from(new Set([
      ...lockedIds.filter((id) => task.assignees.some((a) => a.user.id === id)),
      ...assigneeIds,
    ]));
    setServerError(null);
    try {
      const content = richContent.replace(/<[^>]+>/g, '').trim() ? richContent : values.content;

      const attachmentsToAdd: { fileName: string; filePath: string; fileSize: number }[] = [];
      for (const file of newFiles) {
        const fd = new FormData();
        fd.append('file', file);
        // Upload thẳng vào folder <taskId>/attachments/ (không vào misc/)
        fd.append('taskId', task.id);
        fd.append('subFolder', 'attachments');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message ?? `Upload thất bại: ${file.name}`);
        }
        const data = await res.json();
        attachmentsToAdd.push({ fileName: file.name, filePath: data.filePath, fileSize: file.size });
      }

      await updateTask.mutateAsync({
        id: task.id,
        data: {
          ...omitUnchangedImportant(values, task.isImportant),
          assigneeIds: finalIds,
          content,
          attachmentsToAdd: attachmentsToAdd.length ? attachmentsToAdd : undefined,
          attachmentsToRemove: removedIds.length ? removedIds : undefined,
        },
      });
      onClose();
    } catch (err: unknown) {
      setServerError((err as Error).message ?? 'Đã xảy ra lỗi');
    }
  }

  function handleSubmitClick() {
    setAssigneeTouched(true);
    if (richContent.replace(/<[^>]+>/g, '').trim()) {
      setValue('content', richContent, { shouldValidate: true });
    }
    setValue('assigneeIds', assigneeIds.filter(Boolean), { shouldValidate: true });
    handleSubmit(onSubmit)();
  }

  return {
    form,
    currentUserId,
    isBossOrAdmin,
    priorities,
    taskTypes,
    serverError,
    richContent,    setRichContent,
    assigneeIds,    setAssigneeIds,
    assigneeTouched,
    lockedIds,
    lockedLabels,
    newFiles,       setNewFiles,
    removedIds,     setRemovedIds,
    isPending: updateTask.isPending,
    handleSubmitClick,
  };
}
