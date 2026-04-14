'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSession } from 'next-auth/react';
import { useCreateTask } from '../../hooks/useCreateTask';
import { usePriorities } from '@/modules/settings/hooks/usePriorities';
import { useTaskTypes } from '@/modules/settings/hooks/useTaskTypes';
import { createTaskSchema, type CreateTaskInput, type CreateTaskOutput } from '../../validators/create-task.schema';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function useCreateTaskForm(onClose: () => void) {
  const { data: session } = useSession();
  const currentUserId   = session?.user?.id ?? '';
  const isBossOrAdmin   = ['BOSS', 'ADMIN'].includes(session?.user?.role?.name ?? '');

  const createTask              = useCreateTask();
  const { data: priorities = [] } = usePriorities();
  const { data: taskTypes  = [] } = useTaskTypes();

  const [serverError,     setServerError]     = useState<string | null>(null);
  const [assigneeIds,     setAssigneeIds]     = useState<string[]>([]);
  const [assigneeTouched, setAssigneeTouched] = useState(false);
  const [attachments,     setAttachments]     = useState<File[]>([]);
  const [richContent,     setRichContent]     = useState('');

const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      workflowMode:  'IMMEDIATE',
      isForceMode:   false,
      assigneeIds:   [],
      scheduleStart: today(),
    },
  });

  const { reset, setValue, handleSubmit } = form;

  const defaultPriorityId = priorities.find((p) => p.name === 'Bình thường')?.id ?? '';
  const defaultTypeId     = taskTypes.find((t) => t.name === 'Phần mềm')?.id ?? '';

  useEffect(() => {
    if (currentUserId && assigneeIds.length === 0) setAssigneeIds([currentUserId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    if (defaultPriorityId) setValue('priorityId', defaultPriorityId);
  }, [defaultPriorityId, setValue]);

  useEffect(() => {
    if (defaultTypeId) setValue('typeId', defaultTypeId);
  }, [defaultTypeId, setValue]);

  function handleClose() {
    reset({
      title:         '',
      content:       '',
      priorityId:    defaultPriorityId,
      typeId:        defaultTypeId,
      scheduleStart: today(),
      scheduleEnd:   '',
      workflowMode:  'IMMEDIATE',
      isForceMode:   false,
      assigneeIds:   [],
    });
    setAssigneeIds(currentUserId ? [currentUserId] : []);
    setAssigneeTouched(false);
    setServerError(null);
    setAttachments([]);
    setRichContent('');
    onClose();
  }

  async function onSubmit(values: CreateTaskInput) {
    const valid = assigneeIds.filter(Boolean);
    if (valid.length === 0) return;
    setServerError(null);
    try {
      const content = richContent.replace(/<[^>]+>/g, '').trim() ? richContent : values.content;

      // Upload files first, then pass filePath references to the API
      const uploadedAttachments: { fileName: string; filePath: string; fileSize: number }[] = [];
      for (const file of attachments) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message ?? `Upload thất bại: ${file.name}`);
        }
        const data = await res.json();
        uploadedAttachments.push({ fileName: file.name, filePath: data.filePath, fileSize: file.size });
      }

      await createTask.mutateAsync({ ...values, assigneeIds: valid, content, attachments: uploadedAttachments });
      handleClose();
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
    assigneeIds,   setAssigneeIds,
    assigneeTouched,
    attachments,   setAttachments,
    richContent,   setRichContent,
    isPending: createTask.isPending,
    handleClose,
    handleSubmitClick,
  };
}
