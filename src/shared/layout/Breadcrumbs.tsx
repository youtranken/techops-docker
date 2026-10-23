'use client';

/** Breadcrumb theo route (preview `.crumb`). Dữ liệu từ buildCrumbs() — nav/nav-model.ts. */
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildCrumbs, type Crumb } from './nav/nav-model';

/** Mã công việc lấy từ cache của trang chi tiết (['task', id]); không gọi API thêm. */
function TaskCrumb({ id }: { id: string }) {
  const t = useTranslations();
  // Chỉ đọc cache (không tạo observer → không đụng tới options/queryFn của trang chi tiết)
  const qc = useQueryClient();
  const subscribe = useCallback((cb: () => void) => qc.getQueryCache().subscribe(cb), [qc]);
  const code = useSyncExternalStore(
    subscribe,
    () => qc.getQueryData<{ taskCode?: string | null }>(['task', id])?.taskCode ?? null,
    () => null,
  );
  const data = code ? { taskCode: code } : null;
  return data?.taskCode ? <span className="font-mono">{data.taskCode}</span> : <>{t('nav.taskDetail')}</>;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const view = useSearchParams().get('view');
  const crumbs = buildCrumbs(pathname, view);

  const text = (c: Crumb) => (c.taskId ? <TaskCrumb id={c.taskId} /> : c.label ? t(c.label) : c.text);

  return (
    <nav aria-label={t('nav.crumbs')} className={cn('min-w-0', className)}>
      <ol className="m-0 flex min-w-0 list-none items-center gap-1.5 p-0 text-[13px] text-ink-3">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className={cn('flex min-w-0 items-center gap-1.5', !last && 'shrink-0', i < crumbs.length - 2 && 'max-sm:hidden')}>
              {i > 0 && <ChevronRight aria-hidden className={cn('size-3.5 shrink-0', i === crumbs.length - 2 && 'max-sm:hidden')} />}
              {last || !c.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={cn('truncate', last ? 'font-medium text-ink' : '')}
                >
                  {text(c)}
                </span>
              ) : (
                <Link href={c.href} className="rounded-sm no-underline hover:text-ink hover:underline hover:underline-offset-[3px]">
                  {text(c)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
