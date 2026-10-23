import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SecurityConfig } from '../types';
import { useErrorMessage } from '@/lib/useErrorMessage';

const QUERY_KEY = ['settings', 'security-config'];

// ─── Fetch ───────────────────────────────────────────────────────────────────

async function fetchSecurityConfig(): Promise<SecurityConfig> {
  const res = await fetch('/api/settings/security');
  if (!res.ok) throw new Error('Không thể tải cấu hình bảo mật');
  return res.json();
}

// ─── Update ──────────────────────────────────────────────────────────────────

async function updateSecurityConfig(data: Partial<SecurityConfig>): Promise<SecurityConfig> {
  const res = await fetch('/api/settings/security', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Không thể cập nhật cấu hình');
  }
  return res.json();
}

// ─── Reset ───────────────────────────────────────────────────────────────────

async function resetSecurityConfig(): Promise<SecurityConfig> {
  const res = await fetch('/api/settings/security', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset' }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Không thể reset cấu hình');
  }
  return res.json();
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSecurityConfig() {
  const errMsg = useErrorMessage();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSecurityConfig,
    staleTime: 5 * 60 * 1000, // 5 phút
  });

  const updateMutation = useMutation({
    mutationFn: updateSecurityConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
      toast.success('Đã lưu cấu hình bảo mật');
    },
    onError: (err: Error) => {
      toast.error(errMsg(err));
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetSecurityConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
      toast.success('Đã reset về cấu hình mặc định');
    },
    onError: (err: Error) => {
      toast.error(errMsg(err));
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    reset: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}
