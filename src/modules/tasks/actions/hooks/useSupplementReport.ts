'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

interface FileEntry { fileName: string; filePath: string; fileSize: number; _file?: File }

interface SupplementPayload {
  taskId: string;
  content: string;
  files?: FileEntry[];
}

async function uploadFile(taskId: string, file: File): Promise<{ filePath: string; fileSize: number }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('taskId', taskId);
  fd.append('subFolder', 'reports');
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw toApiError(body, `Upload thất bại: ${file.name}`, res.status);
  }
  const data = await res.json();
  return { filePath: data.filePath, fileSize: file.size };
}

export function useSupplementReport() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, content, files }: SupplementPayload) => {
      // Upload từng file (nếu có _file = file thật chưa upload)
      const uploadedFiles: { fileName: string; filePath: string; fileSize: number }[] = [];
      for (const f of files ?? []) {
        if (f._file) {
          const up = await uploadFile(taskId, f._file);
          uploadedFiles.push({ fileName: f.fileName, filePath: up.filePath, fileSize: up.fileSize });
        } else {
          uploadedFiles.push({ fileName: f.fileName, filePath: f.filePath, fileSize: f.fileSize });
        }
      }

      const res = await fetch(`/api/tasks/${taskId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, files: uploadedFiles }),
      });
      const json = await res.json();
      if (!res.ok) throw toApiError(json, 'Bổ sung báo cáo thất bại', res.status);
      return json as { ok: boolean; version: string };
    },
    onSuccess: (data, vars) => {
      toast.success(`Đã bổ sung báo cáo (phiên bản v${data.version})`);
      qc.invalidateQueries({ queryKey: ['task', vars.taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
