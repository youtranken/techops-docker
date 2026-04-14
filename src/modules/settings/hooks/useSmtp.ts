'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SmtpConfig, SmtpConfigInput } from '../types';

export type { SmtpConfig };

async function fetchSmtp(): Promise<SmtpConfig | null> {
  const res = await fetch('/api/settings/smtp');
  if (!res.ok) throw new Error('Không thể tải cấu hình SMTP');
  const data = await res.json();
  return data; // null if not configured
}

export function useSmtpConfig() {
  return useQuery({ queryKey: ['smtp-config'], queryFn: fetchSmtp, staleTime: 10 * 60_000 });
}

export function useUpdateSmtpConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SmtpConfigInput) => {
      const res = await fetch('/api/settings/smtp', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const fieldErrors = json.error?.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          const first = Object.entries(fieldErrors)[0];
          if (first) throw new Error(`${first[1][0]}`);
        }
        throw new Error(json.error?.message ?? 'Lỗi lưu SMTP');
      }
      return json as SmtpConfig;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smtp-config'] }),
  });
}

export function useTestSmtp() {
  return useMutation({
    mutationFn: async (testEmail: string) => {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi gửi email test');
      return json as { success: boolean; message: string };
    },
  });
}
