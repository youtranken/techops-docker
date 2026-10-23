'use client';

/** Bình luận gần đây — V1 `recentComments`: bình luận mới nhất của mỗi việc, tối đa 6. Bấm → ngăn xem nhanh. */
import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { useFormat } from '@/i18n/useFormat';
import type { RecentComment } from '../../services/stats/types';
import { commentPreview, timeAgo } from '../../view-model/dashboard-logic';
import { DashCard, CardEmpty, RowList } from '../parts/DashCard';
import type { OpenTask } from './ListCards';

export function CommentsCard({ items, onOpen, now }: { items: RecentComment[]; onOpen: OpenTask; now: Date }) {
  const t = useTranslations();
  const f = useFormat();
  const ids = items.map((c) => c.task.id);
  const when = (d: Date | string) => {
    const a = timeAgo(d, now);
    return a.key === 'date' ? f.date(d) : t(a.key, 'values' in a ? a.values : undefined);
  };
  return (
    <DashCard id="db-cm" className="v2-db-cm" title={t('db.cm.t')} sub={t('db.cm.sub')}>
      {!items.length ? (
        <CardEmpty icon={MessageSquare} text={t('db.cm.empty')} />
      ) : (
        <RowList>
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid="db-cm-row"
              onClick={() => onOpen(c.task.id, ids)}
              title={[c.task.taskCode, c.task.title].filter(Boolean).join(' · ')}
              className="grid w-full grid-cols-[24px_minmax(0,1fr)] items-start gap-x-2.5 border-0 border-t border-line bg-transparent px-4 py-2.5 text-left first:border-t-0 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring max-[680px]:px-3.5"
            >
              <UserAvatar displayName={c.author.displayName} avatarUrl={c.author.avatarUrl} avatarColor={c.author.avatarColor} size="sm" className="mt-px size-6" />
              <span className="min-w-0">
                <span className="flex min-w-0 items-baseline gap-1.5 text-[13px]">
                  <b className="flex-none whitespace-nowrap font-semibold text-ink">{c.author.displayName}</b>
                  {c.task.taskCode && <span className="flex-none font-mono text-xs text-ink-3">{c.task.taskCode}</span>}
                  <span className="min-w-0 flex-1 truncate text-ink-3">{c.task.title}</span>
                  <time className="flex-none whitespace-nowrap pl-1.5 text-xs text-ink-3" dateTime={String(c.createdAt)}>{when(c.createdAt)}</time>
                </span>
                <span className="mt-0.5 line-clamp-2 text-[13px] leading-normal text-ink-2 [overflow-wrap:anywhere]">{commentPreview(c.content)}</span>
              </span>
            </button>
          ))}
        </RowList>
      )}
    </DashCard>
  );
}
