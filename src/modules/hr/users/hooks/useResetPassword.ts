'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ResetPasswordPayload {
  userId: string;
  password: string;
}

async function resetPassword({ userId, password }: ResetPasswordPayload): Promise<void> {
  const res = await fetch(`/api/hr/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: { message?: string } })?.error?.message ?? 'Đổi mật khẩu thất bại');
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation<void, Error, ResetPasswordPayload>({
    mutationFn: resetPassword,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'users'] });
    },
  });
}
