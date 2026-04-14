'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserWithRole } from '../services/user.service';

export interface CreateUserPayload {
  username: string;
  displayName: string;
  email?: string;
  password: string;
  roleId: string;
}

async function createUser(data: CreateUserPayload): Promise<UserWithRole> {
  const res = await fetch('/api/hr/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Failed to create user');
  }
  return body.data;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserWithRole, Error, CreateUserPayload>({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'users'] });
    },
  });
}
