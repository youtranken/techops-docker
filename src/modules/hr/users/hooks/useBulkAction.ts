'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useErrorMessage } from '@/lib/useErrorMessage';

export type BulkActionType = 'deactivate' | 'activate' | 'changeRole' | 'forceChangePassword';

export interface BulkActionPayload {
  action: BulkActionType;
  userIds: string[];
  roleId?: string;
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

const ACTION_LABELS: Record<BulkActionType, string> = {
  deactivate: 'Vô hiệu hóa',
  activate: 'Kích hoạt lại',
  changeRole: 'Đổi vai trò',
  forceChangePassword: 'Bắt buộc đổi mật khẩu',
};

export function useBulkAction(onSuccess?: () => void) {
  const errMsg = useErrorMessage();
  const queryClient = useQueryClient();

  return useMutation<{ affected: number }, Error, BulkActionPayload>({
    mutationFn: executeBulkAction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
      const label = ACTION_LABELS[variables.action] ?? 'Thao tác';
      toast.success(`${label} ${data.affected} người dùng thành công`);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(errMsg(err, 'Thao tác thất bại'));
    },
  });
}
