import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DigestConfig, DigestConfigInput } from '../types';
import { toApiError } from '@/lib/errors';

const QK = ['digest-config'] as const;

async function fetchConfig(): Promise<DigestConfig | null> {
  const res = await fetch('/api/settings/digest-config');
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // A3-7: kèm HTTP status để trang biết 403 (không có quyền)
    throw toApiError(err, 'Không thể tải cài đặt báo cáo', res.status);
  }
  return res.json();
}

export function useDigestConfig() {
  return useQuery({ queryKey: QK, queryFn: fetchConfig, retry: (n, e) => (e as { status?: number }).status !== 403 && n < 1 });
}

export function useUpdateDigestConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: DigestConfigInput) => {
      const res = await fetch('/api/settings/digest-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } })?.error?.message ?? 'Lỗi khi lưu');
      }
      return res.json() as Promise<DigestConfig>;
    },
    onSuccess: (data) => qc.setQueryData(QK, data),
  });
}

export function useSendTestDigest() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/settings/digest-config/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } })?.error?.message ?? 'Lỗi khi gửi');
      }
      return res.json() as Promise<{ message: string }>;
    },
  });
}
