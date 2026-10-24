'use client';

/** Danh sách yêu cầu mật khẩu (preview `.pol`): tick khi đạt, viền đỏ + icon cảnh báo khi bấm lưu mà chưa đạt.
 *  `checks` lấy từ policyChecks() (settings/lib/password-rules.ts) — khớp luật server lib/password-policy.ts. */
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PolicyItem { key: string; values?: Record<string, number>; ok: boolean }

export function PasswordPolicyList({ id, checks, bad, loading, className }: {
  /** id của dòng tiêu đề — gắn vào aria-describedby của ô mật khẩu mới */
  id: string;
  checks: PolicyItem[];
  bad?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const met = checks.filter((c) => c.ok).length;
  return (
    <div
      className={cn('rounded-ctl bg-surface-2 px-3 py-2.5', bad && 'shadow-[inset_0_0_0_1px_var(--danger)]', className)}
      data-testid="pw-policy"
    >
      <p id={id} className="m-0 mb-1.5 text-xs font-medium text-ink-2">{loading ? t('pfx.pol.loading') : t('au.pol.title')}</p>
      <ul aria-labelledby={id} className="m-0 grid list-none gap-1 p-0">
        {checks.map((c) => (
          <li key={c.key} data-ok={c.ok || undefined} className={cn('flex items-center gap-2 text-xs', c.ok ? 'text-ink' : 'text-ink-2')}>
            {c.ok
              ? <CheckCircle2 aria-hidden className="size-3.5 flex-none text-c-done" />
              : bad
                ? <AlertCircle aria-hidden className="size-3.5 flex-none text-danger" />
                : <Circle aria-hidden className="size-3.5 flex-none text-ink-3" />}
            <span>{t(c.key, c.values)}</span>
            <span className="sr-only">, {t(c.ok ? 'au.pol.met' : 'au.pol.unmet')}</span>
          </li>
        ))}
      </ul>
      <span className="sr-only" aria-live="polite">{t('au.pol.count', { x: met, n: checks.length })}</span>
    </div>
  );
}
