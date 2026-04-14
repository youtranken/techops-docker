'use client';

import { useQuery } from '@tanstack/react-query';
import type { RoleWithCount } from '../services/role.service';

async function fetchRoles(): Promise<RoleWithCount[]> {
  const res = await fetch('/api/hr/roles');
  if (!res.ok) throw new Error('Failed to fetch roles');
  const json = await res.json() as { data: RoleWithCount[] };
  return json.data;
}

export function useRoles() {
  return useQuery<RoleWithCount[], Error>({
    queryKey: ['hr', 'roles'],
    queryFn: fetchRoles,
    staleTime: 60_000,
  });
}
