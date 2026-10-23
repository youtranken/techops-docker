'use client';

/**
 * Bình luận (preview `.cmc` — mỗi bình luận một ô). Hành vi V1 giữ nguyên:
 * - Gửi bằng nút Gửi hoặc Ctrl+Enter; "Trả lời" chèn `@[Tên]` vào đầu nội dung (như xem nhanh V1), KHÔNG gửi mảng mentions.
 * - Sửa: chỉ tác giả; Xóa: tác giả hoặc Admin (CommentItem V1). Thêm hộp xác nhận khi xóa (preview, A1 bỏ xoá không hỏi).
 * - Ô soạn ẩn khi việc Đã xong/Đã hủy (CommentList V1).
 */
import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Send, Pencil, Trash2, Reply, X, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/utils';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '../../hooks/useComments';
import type { CommentItem } from '../../services/comment.service';
import { fmtDateTime } from './ReportDialog';
import type { TaskDetailModel } from './useTaskDetailModel';

function renderContent(text: string) {
  return text.split(/(@\[[^\]]+\])/g).map((part, i) => {
    const m = part.match(/^@\[([^\]]+)\]$/);
    return m ? <span key={i} className="font-medium text-primary-text">@{m[1]}</span> : <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const miniBtn = 'grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

function CommentCard({ c, model, onReply, replying, tools = true }: {
  c: CommentItem; model: TaskDetailModel; onReply?: (c: CommentItem) => void; replying?: boolean; tools?: boolean;
}) {
  const t = useTranslations();
  const f = useFormat();
  const confirm = useConfirm();
  const update = useUpdateComment();
  const del = useDeleteComment();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(c.content);
  const isAuthor = c.author.id === model.viewerId;
  const canEdit = tools && isAuthor && !c.isDeleted;
  const canDelete = tools && (isAuthor || model.isAdmin) && !c.isDeleted;
  const edited = String(c.updatedAt) !== String(c.createdAt) && !c.isDeleted;

  async function remove() {
    const ok = await confirm({
      title: t('app.dlg.cmDel.t'),
      description: isAuthor ? t('app.dlg.cmDel.d') : t('app.dlg.cmDel.dOther', { a: c.author.displayName }),
      confirmText: t('app.dlg.cmDel.ok'),
      danger: true,
    });
    if (ok) del.mutate({ taskId: model.task.id, commentId: c.id });
  }

  return (
    <div className="group/cm" data-comment={c.id}>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
        <UserAvatar displayName={c.author.displayName} avatarUrl={c.author.profile?.avatarUrl} avatarColor={c.author.profile?.avatarColor} size="xs" />
        <b className="font-semibold text-ink">{c.author.displayName}</b>
        <span className="text-xs text-ink-3">{fmtDateTime(c.createdAt, f.locale)}{edited ? ` · ${t('td.cm.edited')}` : ''}</span>
        {!editing && !c.isDeleted && (onReply || canEdit || canDelete) && (
          <span className="ml-auto flex gap-0.5 self-center">
            {onReply && (
              <button type="button" className={miniBtn} onClick={() => onReply(c)} aria-label={t('tdx.cm.reply')} title={t('tdx.cm.reply')}>
                <Reply aria-hidden className="size-3.5" />
              </button>
            )}
            {canEdit && (
              <button type="button" className={miniBtn} onClick={() => { setDraft(c.content); setEditing(true); }} aria-label={t('td.cm.edit')} title={t('td.cm.edit')}>
                <Pencil aria-hidden className="size-3.5" />
              </button>
            )}
            {canDelete && (
              <button type="button" className={miniBtn} onClick={remove} disabled={del.isPending}
                aria-label={t(isAuthor ? 'td.cm.del' : 'td.cm.delOther')} title={t(isAuthor ? 'td.cm.del' : 'td.cm.delOther')}>
                <Trash2 aria-hidden className="size-3.5" />
              </button>
            )}
          </span>
        )}
      </div>
      {editing ? (
        <div className="ml-7 mt-1.5 max-[680px]:ml-0">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus aria-label={t('td.cm.edit')} className="min-h-[72px] text-sm" />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="xs" onClick={() => setEditing(false)}>{t('tdx.cm.cancel')}</Button>
            <Button type="button" variant="outline" size="xs" disabled={update.isPending || !draft.trim()}
              onClick={() => update.mutate({ taskId: model.task.id, commentId: c.id, content: draft.trim() }, { onSuccess: () => setEditing(false) })}>
              {t('td.cm.save')}
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn(
          'ml-7 mt-1.5 whitespace-pre-line rounded-[10px] bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-ink [overflow-wrap:anywhere] max-[680px]:ml-0',
          replying && 'ring-1 ring-inset ring-primary-text',
          c.isDeleted && 'italic text-ink-3',
        )}>
          {c.isDeleted ? t('tdx.cm.deleted') : renderContent(c.content)}
        </div>
      )}
    </div>
  );
}

function Composer({ model, replyTo, onClearReply, compact }: {
  model: TaskDetailModel; replyTo: CommentItem | null; onClearReply: () => void; compact?: boolean;
}) {
  const t = useTranslations();
  const create = useCreateComment();
  const [content, setContent] = React.useState('');
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { if (replyTo) ref.current?.focus(); }, [replyTo]);

  function submit() {
    const v = content.trim();
    if (!v) return;
    const final = replyTo ? `@[${replyTo.author.displayName}] ${v}` : v;
    create.mutate({ taskId: model.task.id, content: final }, { onSuccess: () => { setContent(''); onClearReply(); } });
  }

  return (
    <div className={cn('flex items-start gap-2.5 border-t border-line pt-4', compact ? 'mt-3.5 pt-3.5' : 'mt-4')}>
      {model.viewer && !compact && (
        <span className="max-[680px]:hidden"><UserAvatar displayName={model.viewer.displayName} size="sm" /></span>
      )}
      <div className="min-w-0 flex-1">
        {replyTo && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-text">
              <CornerDownLeft aria-hidden className="size-3" />@{replyTo.author.displayName}
            </span>
            <button type="button" className={miniBtn} onClick={onClearReply} aria-label={t('tdx.cm.cancelReply')} title={t('tdx.cm.cancelReply')}>
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        )}
        <label className="sr-only" htmlFor={`cm-${model.task.id}-${compact ? 'q' : 'f'}`}>{t('td.cm.label')}</label>
        <Textarea
          id={`cm-${model.task.id}-${compact ? 'q' : 'f'}`}
          ref={ref}
          rows={compact ? 2 : 3}
          value={content}
          disabled={create.isPending}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
          placeholder={replyTo ? t('tdx.cm.replyTo', { a: replyTo.author.displayName }) : t('td.cm.write')}
          className={cn('text-sm', compact ? 'min-h-[60px]' : 'min-h-[68px]')}
        />
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 text-xs text-ink-3">{t('tdx.cm.sendHint')}</span>
          <Button type="button" variant="outline" size="xs" onClick={submit} disabled={create.isPending || !content.trim()}>
            <Send aria-hidden />{t('td.cm.send')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Bảng bình luận đầy đủ (tab của trang) hoặc rút gọn 3 mới nhất (ngăn). */
export function CommentsPanel({ model, compact }: { model: TaskDetailModel; compact?: boolean }) {
  const t = useTranslations();
  const { data, isLoading } = useComments(model.task.id);
  const [replyTo, setReplyTo] = React.useState<CommentItem | null>(null);
  const all = data?.data ?? [];
  const list = compact ? all.slice(-3) : all;

  return (
    <div>
      {isLoading ? (
        <div className="grid gap-3" aria-busy>
          {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-surface-2" />)}
        </div>
      ) : list.length ? (
        <div className="flex flex-col gap-3.5" data-testid="comment-list">
          {list.map((c) => (
            <CommentCard key={c.id} c={c} model={model} tools={!compact} onReply={model.canComment ? setReplyTo : undefined} replying={replyTo?.id === c.id} />
          ))}
        </div>
      ) : (
        <p className="m-0 py-2 text-[13px] text-ink-3">{t('td.cm.empty')}</p>
      )}
      {compact && all.length > 3 && (
        <Link href={`/tasks/${model.task.id}#comments`} className="mt-3 inline-block text-xs font-medium text-primary-text hover:underline">
          {t('td.cm.all', { n: all.length })}
        </Link>
      )}
      {model.canComment && <Composer model={model} replyTo={replyTo} onClearReply={() => setReplyTo(null)} compact={compact} />}
    </div>
  );
}

export function useCommentCount(taskId: string) {
  const { data } = useComments(taskId);
  return data?.pagination.total;
}
