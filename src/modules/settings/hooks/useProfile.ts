'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfileData, ProfileUpdateInput } from '../types';

async function fetchProfile(): Promise<UserProfileData> {
  const res = await fetch('/api/settings/profile');
  if (!res.ok) throw new Error('Không thể tải thông tin profile');
  return res.json();
}

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: fetchProfile, staleTime: 2 * 60_000 });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProfileUpdateInput) => {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi');
      return json as UserProfileData;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Lỗi upload');
      return json as { avatarUrl: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
