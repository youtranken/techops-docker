'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CommentItem } from '../services/comment.service';
import type { PaginatedResult } from '@/lib/types/pagination';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { toApiError } from '@/lib/errors';

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
  const errMsg = useErrorMessage();
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
        throw toApiError(body, 'Gửi bình luận thất bại', res.status);
      }
      return res.json() as Promise<CommentItem>;
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}

export function useUpdateComment() {
  const errMsg = useErrorMessage();
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
        throw toApiError(body, 'Cập nhật bình luận thất bại', res.status);
      }
      return res.json() as Promise<CommentItem>;
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Đã cập nhật bình luận');
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}

export function useDeleteComment() {
  const errMsg = useErrorMessage();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, commentId }: { taskId: string; commentId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw toApiError(body, 'Xóa bình luận thất bại', res.status);
      }
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Đã xóa bình luận');
    },
    onError: (err: Error) => toast.error(errMsg(err)),
  });
}
