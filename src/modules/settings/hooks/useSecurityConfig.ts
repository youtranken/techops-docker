import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SecurityConfig } from '../types';
import { toApiError } from '@/lib/errors';

/** Cấu hình bảo mật hệ thống (chỉ Admin). A3-7: trang tự báo kết quả (toast) — hook không tự toast nữa. */
const QUERY_KEY = ['settings', 'security-config'];

async function fetchSecurityConfig(): Promise<SecurityConfig> {
  const res = await fetch('/api/settings/security');
  const json = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(json, 'Không thể tải cấu hình bảo mật', res.status);
  return json as SecurityConfig;
}

/** V1: PUT cả cấu hình */
async function updateSecurityConfig(data: Partial<SecurityConfig>): Promise<SecurityConfig> {
  const res = await fetch('/api/settings/security', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(json, 'Không thể cập nhật cấu hình', res.status);
  return json as SecurityConfig;
}

/** V1: POST { action: 'reset' } — ghi mặc định ngay */
async function resetSecurityConfig(): Promise<SecurityConfig> {
  const res = await fetch('/api/settings/security', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset' }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(json, 'Không thể reset cấu hình', res.status);
  return json as SecurityConfig;
}

export function useSecurityConfig() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchSecurityConfig, staleTime: 5 * 60 * 1000, retry: (n, e) => (e as { status?: number }).status !== 403 && n < 2 });
  const updateMutation = useMutation({
    mutationFn: updateSecurityConfig,
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
  const resetMutation = useMutation({
    mutationFn: resetSecurityConfig,
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });
  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateAsync: updateMutation.mutateAsync,
    resetAsync: () => resetMutation.mutateAsync(),
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
}
