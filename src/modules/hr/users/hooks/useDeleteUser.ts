'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserWithRole } from '../services/user.service';

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<{ action: 'deleted'; user: UserWithRole }> => {
      const res = await fetch(`/api/hr/users/${id}`, { method: 'DELETE' });
      const json = await res.json() as {
        data?: { action: 'deleted'; user: UserWithRole };
        error?: { message: string };
      };
      if (!res.ok) throw new Error(json.error?.message ?? 'Xóa thất bại');
      return json.data!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'users'] });
    },
  });
}
