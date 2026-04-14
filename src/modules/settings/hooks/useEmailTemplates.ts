'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EmailTemplate, EmailTemplateInput } from '../types';

async function fetchTemplates(): Promise<(EmailTemplate & { isDefault?: boolean })[]> {
  const res = await fetch('/api/settings/email-templates');
  if (!res.ok) throw new Error('Không thể tải templates');
  return res.json();
}

export function useEmailTemplates() {
  return useQuery({ queryKey: ['email-templates'], queryFn: fetchTemplates, staleTime: 60_000 });
}

export function useUpsertEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, ...data }: { key: string } & EmailTemplateInput) => {
      const res = await fetch('/api/settings/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json as EmailTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
  });
}
