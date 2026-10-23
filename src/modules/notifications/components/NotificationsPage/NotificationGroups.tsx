'use client';

/** Danh sách nhóm Hôm nay / Hôm qua / Cũ hơn (múi giờ app) + skeleton đúng hình (preview `.nt-g .nt-list .sk-row`). */
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/shared/ui/States';
import type { NotificationWithTask } from '../../services/notification.service';
import { groupByDay3 } from '../../lib/group-by-day';
import { NotificationRow } from './NotificationRow';

const GROUPS = [['today', 'nt.g.today'], ['yesterday', 'nt.g.yday'], ['older', 'nt.g.older']] as const;

interface Props {
  items: NotificationWithTask[];
  onOpen: (n: NotificationWithTask) => void;
  onMarkRead: (n: NotificationWithTask) => void;
}

export function NotificationGroups({ items, onOpen, onMarkRead }: Props) {
  const t = useTranslations();
  const g = groupByDay3(items, new Date());
  const shown = GROUPS.filter(([k]) => g[k].length > 0);
  return (
    <>
      {shown.map(([k, label], i) => (
        <section key={k} aria-labelledby={`nt-g-${k}`} data-group={k}>
          <h2 id={`nt-g-${k}`} className={cn('m-0 px-5 pb-1.5 pt-3 text-xs font-medium text-ink-3 max-[680px]:px-3.5', i > 0 && 'border-t border-line')}>
            {t(label)}
          </h2>
          <ul className="m-0 list-none p-0 pb-1">
            {g[k].map((n, j) => <NotificationRow key={n.id} n={n} first={j === 0} onOpen={onOpen} onMarkRead={onMarkRead} />)}
          </ul>
        </section>
      ))}
    </>
  );
}

export function FeedSkeleton() {
  const t = useTranslations();
  return (
    <div aria-busy="true" data-testid="nt-skeleton">
      <span className="sr-only">{t('app.loading')}</span>
      {[82, 58, 82, 58, 82, 58].map((w, i) => (
        <div key={i} className={cn('grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3.5 px-5 py-3.5 max-[680px]:px-3.5', i > 0 && 'border-t border-line')}>
          <Skeleton variant="circle" className="size-8" />
          <div className="grid gap-2">
            <Skeleton variant="line" style={{ width: `${w}%` }} />
            <Skeleton variant="line" className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
