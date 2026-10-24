'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UserPermRow, SavePermissionInput } from '../types';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

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
  if (!res.ok) throw toApiError(await res.json().catch(() => null), 'Lưu thất bại', res.status);
}

export function useSidebarPermissions() {
  return useQuery<UserPermRow[]>({
    queryKey: ['hr', 'sidebar-permissions'],
    queryFn: fetchPermissions,
    staleTime: 30_000,
  });
}

/** Lưu quyền menu của 1 nhân viên (PUT như V1). Câu báo thành công do nơi gọi hiện (A3-4: "Đã lưu n thay đổi cho …"). */
export function useSavePermission() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: savePermission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'sidebar-permissions'] });
    },
    onError: (err: Error) => {
      toast.error(errMsg(err, 'Lưu phân quyền thất bại'));
    },
  });
}
