'use client';

import { useQuery } from '@tanstack/react-query';
import type { UserWithRoleAndTasks } from '../types';
import type { PaginatedResult } from '@/lib/types/pagination';

export interface UseUsersFilters {
  search?: string;
  roleId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  createdFrom?: string;
  createdTo?: string;
}

async function fetchUsers(filters: UseUsersFilters): Promise<PaginatedResult<UserWithRoleAndTasks>> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.roleId) params.set('roleId', filters.roleId);
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.createdFrom) params.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) params.set('createdTo', filters.createdTo);

  const res = await fetch(`/api/hr/users?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? 'Failed to fetch users');
  }
  return res.json();
}

export function useUsers(filters: UseUsersFilters = {}) {
  return useQuery<PaginatedResult<UserWithRoleAndTasks>, Error>({
    queryKey: ['hr', 'users', filters],
    queryFn: () => fetchUsers(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
