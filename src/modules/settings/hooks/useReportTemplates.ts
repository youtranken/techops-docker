'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ReportTemplate {
  id: string;
  title: string;
  content: string;
  category: string | null;
  taskTypeId: string | null;
  isActive: boolean;
  createdAt: string;
}

export type ReportTemplateInput = {
  title: string;
  content: string;
  category?: string | null;
  taskTypeId?: string | null;
  isActive?: boolean;
};

export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: async (): Promise<ReportTemplate[]> => {
      const res = await fetch('/api/settings/completion-templates');
      if (!res.ok) throw new Error('Không thể tải danh sách mẫu báo cáo');
      const json = await res.json();
      return json.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReportTemplateInput) => {
      const res = await fetch('/api/settings/completion-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi khi tạo template');
      return json.data as ReportTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-templates'] }),
  });
}

export function useUpdateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReportTemplateInput> }) => {
      const res = await fetch(`/api/settings/completion-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi khi cập nhật template');
      return json.data as ReportTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-templates'] }),
  });
}

export function useDeleteReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/completion-templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Không thể xóa template');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-templates'] }),
  });
}
