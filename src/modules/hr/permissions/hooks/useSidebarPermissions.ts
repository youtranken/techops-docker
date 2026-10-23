'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UserPermRow, SavePermissionInput } from '../types';
import { useErrorMessage } from '@/lib/useErrorMessage';

type ApiResponse = { data: UserPermRow[] };

async function fetchPermissions(): Promise<UserPermRow[]> {
  const res = await fetch('/api/hr/sidebar-permissions');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json() as ApiResponse;
  return json.data;
}

async function savePermission(input: SavePermissionInput): Promise<void> {
  const res = await fetch('/api/hr/sidebar-permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Lưu thất bại');
}

export function useSidebarPermissions() {
  return useQuery<UserPermRow[]>({
    queryKey: ['hr', 'sidebar-permissions'],
    queryFn: fetchPermissions,
    staleTime: 30_000,
  });
}

export function useSavePermission() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savePermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'sidebar-permissions'] });
      toast.success('Đã cập nhật phân quyền');
    },
    onError: (err: Error) => {
      toast.error(errMsg(err, 'Lưu phân quyền thất bại'));
    },
  });
}
