'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserWithRole } from '../services/user.service';

async function deactivateUser(id: string): Promise<UserWithRole> {
  const res = await fetch(`/api/hr/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: false }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Failed to deactivate user');
  }
  return body.data;
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRole, Error, string>({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
    },
  });
}
