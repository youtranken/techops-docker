'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CommentItem } from '../services/comment.service';
import type { PaginatedResult } from '@/lib/types/pagination';

export function useComments(taskId: string, page = 1) {
  return useQuery<PaginatedResult<CommentItem>>({
    queryKey: ['comments', taskId, page],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/comments?page=${page}&limit=50`);
      if (!res.ok) throw new Error('Không thể tải bình luận');
      return res.json();
    },
    enabled: !!taskId,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      content,
      mentions,
    }: {
      taskId: string;
      content: string;
      mentions?: string[];
    }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mentions }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Gửi bình luận thất bại');
      }
      return res.json() as Promise<CommentItem>;
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      commentId,
      content,
    }: {
      taskId: string;
      commentId: string;
      content: string;
    }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Cập nhật bình luận thất bại');
      }
      return res.json() as Promise<CommentItem>;
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Đã cập nhật bình luận');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, commentId }: { taskId: string; commentId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? 'Xóa bình luận thất bại');
      }
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Đã xóa bình luận');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
