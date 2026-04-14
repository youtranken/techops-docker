'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export type BulkActionType = 'deactivate' | 'activate';

export interface BulkActionPayload {
  action: BulkActionType;
  userIds: string[];
}

async function executeBulkAction(payload: BulkActionPayload): Promise<{ affected: number }> {
  const res = await fetch('/api/hr/users/bulk-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Thao tác thất bại');
  }
  return body.data as { affected: number };
}

export function useBulkAction(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<{ affected: number }, Error, BulkActionPayload>({
    mutationFn: executeBulkAction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
      const label = variables.action === 'deactivate' ? 'Vô hiệu hóa' : 'Kích hoạt lại';
      toast.success(`${label} ${data.affected} người dùng thành công`);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message ?? 'Thao tác thất bại');
    },
  });
}
