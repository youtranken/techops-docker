'use client';

import { MessageSquare, Send, ChevronDown, ChevronUp, X, CornerDownLeft } from 'lucide-react';
import { useComments, useCreateComment } from '../../hooks/useComments';
import { CommentItem } from '../Comments/CommentItem';
import { useState, useRef, useCallback, useEffect } from 'react';

interface QuickViewCommentsProps {
  taskId: string;
  currentUserId: string;
  isAdmin: boolean;
  canComment?: boolean;
}

interface InlineCommentBoxProps {
  taskId: string;
  replyTo?: { id: string; displayName: string } | null;
  onClearReply?: () => void;
  onSubmitted?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function InlineCommentBox({ taskId, replyTo, onClearReply, onSubmitted, textareaRef }: InlineCommentBoxProps) {
  const [content, setContent] = useState('');
  const create = useCreateComment();

  useEffect(() => {
    if (replyTo) { setContent(''); textareaRef?.current?.focus(); }
  }, [replyTo, textareaRef]);

  function submit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    const final = replyTo ? `@[${replyTo.displayName}] ${trimmed}` : trimmed;
    create.mutate({ taskId, content: final }, {
      onSuccess: () => { setContent(''); onSubmitted?.(); },
    });
  }

  return (
    <div className="space-y-1.5">
      {replyTo && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
            <CornerDownLeft className="h-2.5 w-2.5 shrink-0" />
            @{replyTo.displayName}
          </span>
          <button onClick={onClearReply} className="text-slate-400 hover:text-slate-600 transition-colors" title="Bỏ trả lời">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
          placeholder={replyTo ? `Trả lời @${replyTo.displayName}...` : 'Viết bình luận... (Ctrl+Enter)'}
          disabled={create.isPending}
          className="flex-1 text-sm resize-none bg-transparent outline-none
            placeholder:text-slate-400 focus:placeholder:text-slate-300 transition-colors"
        />
        <button onClick={submit} disabled={create.isPending || !content.trim()}
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all
            bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const COLLAPSED_COUNT = 2;

export function QuickViewComments({ taskId, currentUserId, isAdmin, canComment = true }: QuickViewCommentsProps) {
  const { data, isLoading } = useComments(taskId);
  const count = data?.pagination.total ?? 0;
  const [expanded, setExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; displayName: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleReply = useCallback((id: string, displayName: string) => {
    setReplyTo({ id, displayName });
  }, []);

  const allComments = data?.data ?? [];
  const needsCollapse = allComments.length > COLLAPSED_COUNT;
  const visibleComments = needsCollapse && !expanded
    ? allComments.slice(-COLLAPSED_COUNT)
    : allComments;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bình luận</p>
        </div>
        {count > 0 && (
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-2.5 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  <div className="h-2.5 w-full bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : allComments.length > 0 ? (
          <div className="space-y-3">
            {/* Expand / collapse toggle */}
            {needsCollapse && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:underline"
              >
                {expanded ? (
                  <><ChevronUp className="h-3.5 w-3.5" />Thu gọn</>
                ) : (
                  <><ChevronDown className="h-3.5 w-3.5" />Xem tất cả {allComments.length} bình luận</>
                )}
              </button>
            )}
            {visibleComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                taskId={taskId}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onReply={handleReply}
                isReplying={replyTo?.id === comment.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">Chưa có bình luận nào</p>
        )}
      </div>

      {/* Input box */}
      {canComment && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2.5 bg-slate-50/50 dark:bg-slate-800/30">
          <InlineCommentBox
            taskId={taskId}
            replyTo={replyTo}
            onClearReply={() => setReplyTo(null)}
            onSubmitted={() => setReplyTo(null)}
            textareaRef={textareaRef}
          />
        </div>
      )}
    </div>
  );
}
