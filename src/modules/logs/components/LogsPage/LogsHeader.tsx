'use client';

/**
 * Đầu trang Nhật ký + thanh tab (preview logs.html `.head` + `.tabs`). Tab = đường dẫn V1 (/logs/task-activity,
 * /logs/user-activity, /logs/task-reference), hiện theo quyền tính năng V1 (`hasFeature('logs', …)`; ADMIN/BOSS thấy cả 3).
 * "Xuất Excel" của preview không có ở V1 (chỉ có tự lưu trữ hằng tháng) → Phase B, không hiện.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useMyPermissions } from '@/shared/hooks/useMyPermissions';

const TABS = [
  { href: '/logs/task-activity', key: 'lg.tab.task', feature: 'task_activity' },
  { href: '/logs/user-activity', key: 'lg.tab.user', feature: 'user_activity' },
  { href: '/logs/task-reference', key: 'lg.tab.ref', feature: 'task_reference' },
] as const;

export function LogsHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const { hasFeature } = useMyPermissions();
  const tabs = TABS.filter((x) => hasFeature('logs', x.feature));
  return (
    <>
      <div className="mb-4">
        <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('lg.title')}</h1>
        <p className="m-0 mt-1 text-[13px] text-ink-3">{t('lg.sub')}</p>
      </div>
      <nav aria-label={t('lg.tabs')} className="mb-4 border-b border-line max-[680px]:-mx-4 max-[680px]:px-4">
        <ul className="m-0 flex list-none gap-6 p-0 max-[680px]:gap-[18px]">
          {tabs.map((x) => {
            const active = pathname === x.href || pathname.startsWith(`${x.href}/`);
            return (
              <li key={x.href}>
                <Link href={x.href} aria-current={active ? 'page' : undefined} data-testid={`lg-tab-${x.feature}`}
                  className={cn(
                    '-mb-px flex h-10 items-center border-b-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:h-11',
                    active ? 'border-primary-text text-ink' : 'border-transparent text-ink-3 hover:text-ink',
                  )}>
                  {t(x.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
