'use client';

/** Đặt lại dữ liệu Helpdesk (chỉ ADMIN — API V1): gửi OTP qua email → xoá kèm OTP. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/errors';
import { resetUrl } from '../components/HelpdeskPage/hd-logic';

export function useRequestResetOtp() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/integrations/helpdesk/reset/request-otp', { method: 'POST' });
      const data = await res.json().catch(() => null) as { ok?: boolean; hint?: string } | null;
      if (!res.ok) throw toApiError(data, 'Lỗi gửi OTP', res.status);
      return data;
    },
  });
}

export function useResetHelpdesk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (otp: string) => {
      const res = await fetch(resetUrl(otp), { method: 'DELETE' });
      const data = await res.json().catch(() => null) as { tasks: number; pending: number } | null;
      if (!res.ok || !data) throw toApiError(data, 'Reset thất bại', res.status);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['helpdesk-pending'] });
      void qc.invalidateQueries({ queryKey: ['helpdesk-filter-options'] });
    },
  });
}
