'use client';

/**
 * Trang /settings/smtp (chỉ Admin — layout V1 chặn vai trò khác): 2 tab như V1 "Cấu hình SMTP" · "Mẫu email".
 * V2 đưa tab vào URL (?tab=templates) để nav con mở thẳng mục "Mẫu email".
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SmtpConfigPanel } from './SmtpConfigPanel';
import { EmailTemplatesPanel } from './EmailTemplatesPanel';

export function SmtpPage() {
  const t = useTranslations();
  const tab = useSearchParams()?.get('tab') === 'templates' ? 'templates' : 'config';
  const tabs = [
    { k: 'config', href: '/settings/smtp', label: t('set.s.smtp') },
    { k: 'templates', href: '/settings/smtp?tab=templates', label: t('set.s.emails') },
  ];
  return (
    <div>
      <nav aria-label={t('setx.sm.tabs')} className="mb-5 flex gap-[22px] border-b border-line">
        {tabs.map((x) => (
          <Link
            key={x.k}
            href={x.href}
            aria-current={tab === x.k ? 'page' : undefined}
            className={cn(
              'relative inline-flex h-10 items-center whitespace-nowrap text-sm font-medium text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === x.k && 'font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-sm after:bg-primary',
            )}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {tab === 'config' ? <SmtpConfigPanel /> : <EmailTemplatesPanel />}
    </div>
  );
}
