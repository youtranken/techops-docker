'use client';

import { useState } from 'react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Check, X, Reply } from 'lucide-react';
import { useUpdateComment, useDeleteComment } from '../../hooks/useComments';
import type { CommentItem as CommentItemType } from '../../services/comment.service';

interface Props {
  comment: CommentItemType;
  taskId: string;
  currentUserId: string;
  isAdmin: boolean;
  onReply?: (id: string, displayName: string) => void;
  isReplying?: boolean;
}



function renderContent(text: string) {
  const parts = text.split(/(@\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]$/);
    if (match) {
      return (
        <span key={i} className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded text-[0.8em]">
          @{match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommentItem({ comment, taskId, currentUserId, isAdmin, onReply, isReplying }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const isAuthor = comment.author.id === currentUserId;
  const canEdit = isAuthor && !comment.isDeleted;
  const canDelete = (isAuthor || isAdmin) && !comment.isDeleted;

  function handleSave() {
    if (!draft.trim()) return;
    updateComment.mutate(
      { taskId, commentId: comment.id, content: draft.trim() },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleDelete() {
    deleteComment.mutate({ taskId, commentId: comment.id });
  }

  return (
    <div className={`flex gap-3 text-sm group rounded-lg px-2 py-1.5 -mx-2 transition-colors ${isReplying ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''}`}>
      <UserAvatar
        displayName={comment.author.displayName}
        avatarUrl={comment.author.profile?.avatarUrl}
        avatarColor={comment.author.profile?.avatarColor}
        size="md"
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium transition-colors ${isReplying ? 'text-indigo-700' : 'text-gray-900 dark:text-white'}`}>
            {comment.author.displayName}
          </span>
          <span className="text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && !comment.isDeleted && (
            <span className="text-xs text-muted-foreground italic">(đã chỉnh sửa)</span>
          )}
        </div>

        {comment.isDeleted ? (
          <p className="mt-1 text-muted-foreground italic text-xs">Bình luận đã bị xóa</p>
        ) : editing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleSave}
                disabled={updateComment.isPending || !draft.trim()}
              >
                <Check className="h-3 w-3" />
                Lưu
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => { setEditing(false); setDraft(comment.content); }}
              >
                <X className="h-3 w-3" />
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {renderContent(comment.content)}
          </p>
        )}
      </div>

      {!comment.isDeleted && !editing && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {onReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-indigo-500 hover:text-indigo-700"
              onClick={() => onReply(comment.id, comment.author.displayName)}
              title="Trả lời"
            >
              <Reply className="h-3 w-3" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setEditing(true)}
              title="Chỉnh sửa"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteComment.isPending}
              title="Xóa"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
