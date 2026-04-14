'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserWithRole } from '../services/user.service';

export interface UpdateUserPayload {
  displayName?: string;
  email?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
}

async function updateUser(id: string, data: UpdateUserPayload): Promise<UserWithRole> {
  const res = await fetch(`/api/hr/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Failed to update user');
  }
  return body.data;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRole, Error, { id: string; data: UpdateUserPayload }>({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
    },
  });
}
