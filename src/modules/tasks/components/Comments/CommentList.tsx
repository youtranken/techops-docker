'use client';

import { Separator } from '@/components/ui/separator';
import { MessageSquare } from 'lucide-react';
import { useComments } from '../../hooks/useComments';
import { CommentItem } from './CommentItem';
import { CommentBox } from './CommentBox';

interface Props {
  taskId: string;
  currentUserId: string;
  isAdmin: boolean;
  /** Khi true: không có wrapper card riêng (dùng trong tab container) */
  embedded?: boolean;
  /** Khi false: ẩn ô nhập bình luận (task đã hoàn thành/hủy) */
  canComment?: boolean;

}

export function CommentList({ taskId, currentUserId, isAdmin, embedded, canComment = true }: Props) {
  const { data, isLoading } = useComments(taskId);

  const inner = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">
          Bình luận
          {data && (
            <span className="ml-1 text-muted-foreground font-normal">({data.pagination.total})</span>
          )}
        </p>
      </div>

      <Separator />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="space-y-4">
          {data.data.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              taskId={taskId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      )}

      <Separator />
      {canComment && <CommentBox taskId={taskId} />}
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 p-5">
      {inner}
    </div>
  );
}
