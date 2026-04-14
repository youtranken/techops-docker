'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserWithRole } from '../services/user.service';

async function activateUser(id: string): Promise<UserWithRole> {
  const res = await fetch(`/api/hr/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: true }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Failed to activate user');
  }
  return body.data;
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRole, Error, string>({
    mutationFn: activateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
    },
  });
}
