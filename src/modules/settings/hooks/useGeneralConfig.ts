'use client';
/** Cấu hình chung (/settings/general — V1 gọi fetch trực tiếp trong GeneralSection; API chỉ Admin). */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/errors';

const QK = ['settings', 'general-config'] as const;
export interface GeneralConfig { timezone: string }

export function useGeneralConfig() {
  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<GeneralConfig> => {
      const res = await fetch('/api/settings/general');
      const json = await res.json().catch(() => null);
      if (!res.ok) throw toApiError(json, 'Không thể tải cài đặt chung', res.status);
      return json as GeneralConfig;
    },
  });
}

export function useUpdateGeneralConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: GeneralConfig): Promise<GeneralConfig> => {
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw toApiError(json, 'Lỗi không xác định', res.status);
      return json as GeneralConfig;
    },
    onSuccess: (data) => qc.setQueryData(QK, data),
  });
}
