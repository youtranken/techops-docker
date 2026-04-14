'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FileEntry {
  fileName: string;
  filePath: string;
  fileSize: number;
  _file?: File;
}

interface CompletePayload {
  taskId: string;
  reportContent: string;
  files?: FileEntry[];
}

async function uploadFiles(taskId: string, files: FileEntry[]): Promise<{ fileName: string; filePath: string; fileSize: number }[]> {
  const results: { fileName: string; filePath: string; fileSize: number }[] = [];
  for (const entry of files) {
    if (!entry._file) {
      results.push({ fileName: entry.fileName, filePath: entry.filePath, fileSize: entry.fileSize });
      continue;
    }
    const form = new FormData();
    form.append('file', entry._file);
    form.append('taskId', taskId);
    form.append('subFolder', 'reports');
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? `Upload thất bại: ${entry.fileName}`);
    }
    const data = await res.json();
    results.push({ fileName: entry.fileName, filePath: data.filePath, fileSize: entry.fileSize });
  }
  return results;
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, reportContent, files = [] }: CompletePayload) => {
      // Upload files first if any have actual File objects
      const uploadedFiles = files.length > 0 ? await uploadFiles(taskId, files) : [];

      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportContent, files: uploadedFiles }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Hoàn thành thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      toast.success('Đã gửi báo cáo hoàn thành');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
