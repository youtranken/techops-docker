'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateTaskInput, CreateTaskAttachment } from '../validators/create-task.schema';

interface CreateTaskPayload extends CreateTaskInput {
  attachments?: CreateTaskAttachment[];
}

async function createTask(data: CreateTaskPayload) {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Không thể tạo công việc');
  return json;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
