'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toApiError } from '@/lib/errors';
import { useTranslations } from 'next-intl';
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
    throw toApiError(body, 'Thao tác thất bại', res.status);
  }
  return body.data as { affected: number };
}

/** Câu báo thành công (song ngữ, A3-4) */
const DONE_KEYS: Record<BulkActionType, string> = {
  deactivate: 'ppx.t.bulk.deactivate',
  activate: 'ppx.t.bulk.activate',
  changeRole: 'ppx.t.bulk.changeRole',
  forceChangePassword: 'ppx.t.bulk.forceChangePassword',
};

export function useBulkAction(onSuccess?: () => void) {
  const t = useTranslations();
  const errMsg = useErrorMessage();
  const queryClient = useQueryClient();

  return useMutation<{ affected: number }, Error, BulkActionPayload>({
    mutationFn: executeBulkAction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
      toast.success(t(DONE_KEYS[variables.action], { n: data.affected }));
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(errMsg(err, 'Thao tác thất bại'));
    },
  });
}
