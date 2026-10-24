'use client';

/** Lịch sử hoạt động trong ngăn (thay UserHistoryModal V1): cùng API, 15 dòng/trang, ‹ › khi > 1 trang. */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { History } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/States';
import { Pagination } from '@/shared/ui/Pagination';
import { useFormat } from '@/i18n/useFormat';
import { useUserHistory } from '../../hooks/useUserHistory';

/** Mã hành động V1 → khoá chữ (V1 UserHistoryModal.ACTION_LABELS) */
const ACTIONS = ['LOGIN', 'LOGOUT', 'SESSION_TIMEOUT', 'LOGIN_FAILED', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'RESET_PASSWORD',
  'DEACTIVATE_USER', 'ACTIVATE_USER', 'CHANGE_SETTINGS', 'EXPORT_DATA', 'VIEW_PAGE'];
const LIMIT = 15;

export function UserHistoryList({ userId }: { userId: string }) {
  const t = useTranslations();
  const fmt = useFormat();
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [userId]);
  const { data, isLoading, isError, refetch } = useUserHistory({ userId, page, limit: LIMIT });

  if (isLoading) {
    return <div className="grid gap-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="line" className="h-4" style={{ width: `${70 - i * 9}%` }} />)}</div>;
  }
  if (isError) return <ErrorState className="py-6" description={t('pp.err.d')} onRetry={() => void refetch()} />;
  const rows = data?.data ?? [];
  if (!rows.length) return <EmptyState className="py-6" icon={History} title={t('ppx.h.none')} />;

  const time = (v: string) => new Date(v).toLocaleTimeString(fmt.locale === 'en' ? 'en-GB' : 'vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
  return (
    <>
      <ol className="m-0 list-none p-0">
        {rows.map((e) => (
          <li key={e.id} className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
            <span aria-hidden className="mt-[7px] size-1.5 flex-none rounded-full bg-ink-3" />
            <p className="m-0 min-w-0 flex-1 text-[13px]">
              <span className="font-medium text-ink">{ACTIONS.includes(e.action) ? t(`ppx.a.${e.action}`) : e.action}</span>
              {(e.ipAddress || e.city) && (
                <span className="mt-px block text-xs text-ink-3">
                  {e.ipAddress && <span className="font-mono">{e.ipAddress}</span>}
                  {e.ipAddress && e.city && ' · '}
                  {e.city}
                </span>
              )}
            </p>
            <time dateTime={e.createdAt} className="flex-none whitespace-nowrap font-mono text-xs text-ink-3">
              {fmt.date(e.createdAt)} {time(e.createdAt)}
            </time>
          </li>
        ))}
      </ol>
      {data?.pagination && data.pagination.total > LIMIT && (
        <Pagination page={page} pageSize={LIMIT} total={data.pagination.total} onPageChange={setPage} />
      )}
    </>
  );
}
