'use client';

/**
 * Đầu trang Báo cáo (preview reports.html `.head` + `.rp-nav`): tiêu đề "Báo cáo" + dòng phụ + nút bên phải, dưới là tab con.
 * Tab theo V1 (`reportTabs`): Tổng quan (ai có menu) · Danh sách công việc (Boss/Admin) · Research chỉ khi đang mở trang đó.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { reportTabs } from '../../view/report-logic';

const LABEL = { overview: 'rp.tab.overview', tasks: 'rp.tab.tasks', research: 'rp.tab.research' } as const;

export function ReportHead({ sub, actions }: { sub?: React.ReactNode; actions?: React.ReactNode }) {
  const t = useTranslations();
  const path = usePathname() ?? '';
  const role = useSession().data?.user?.role?.name ?? '';
  const tabs = reportTabs(role === 'ADMIN' || role === 'BOSS', path);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-head text-[22px] font-semibold leading-tight text-ink">{t('rp.title')}</h1>
          {sub !== undefined && <p className="m-0 mt-1 text-[13px] text-ink-3" data-testid="rp-sub">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 max-[680px]:w-full max-[680px]:[&>*]:flex-1">{actions}</div>}
      </div>
      <nav aria-label={t('rp.tabs')} className="mb-4 flex gap-[22px] overflow-x-auto border-b border-line max-[680px]:-mx-4 max-[680px]:px-4">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={x.href}
            aria-current={x.on ? 'page' : undefined}
            className={cn(
              'relative inline-flex h-10 flex-none items-center whitespace-nowrap text-sm font-medium text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              x.on && 'font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-sm after:bg-primary',
            )}
          >
            {t(LABEL[x.key])}
          </Link>
        ))}
      </nav>
    </>
  );
}
