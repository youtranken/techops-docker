'use client';

/** Danh sách yêu cầu mật khẩu (preview people `.pwc`) — theo chính sách Cài đặt › Bảo mật (/api/auth/password-policy). */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_POLICY, policyChecks, type PasswordPolicy } from '../../view/people-forms';

/** V1: lấy chính sách, lỗi thì dùng mặc định */
export function usePasswordPolicy(enabled = true): PasswordPolicy {
  const [policy, setPolicy] = React.useState<PasswordPolicy>(DEFAULT_POLICY);
  React.useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch('/api/auth/password-policy')
      .then((r) => r.json())
      .then((d) => { if (alive && d?.policy) setPolicy(d.policy); })
      .catch(() => { /* dùng mặc định */ });
    return () => { alive = false; };
  }, [enabled]);
  return policy;
}

const LABEL = { len: 'pp.pw.len', up: 'pp.pw.up', lo: 'pp.pw.lo', num: 'pp.pw.num', sp: 'pp.pw.sp' } as const;

export function PasswordChecklist({ id, policy, value }: { id: string; policy: PasswordPolicy; value: string }) {
  const t = useTranslations();
  return (
    <ul id={id} aria-label={t('pp.pw.policy')} className="m-0 mt-2 grid list-none gap-[3px] p-0">
      {policyChecks(policy, value).map((c) => (
        <li key={c.key} className={cn('flex items-center gap-1.5 text-xs', c.met ? 'text-c-done' : 'text-ink-3')}>
          {c.met ? <CheckCircle2 aria-hidden className="size-3.5" /> : <Circle aria-hidden className="size-3.5" />}
          <span>{t(LABEL[c.key], { n: policy.minLength })}</span>
          <span className="sr-only"> — {t(c.met ? 'pp.pw.yes' : 'pp.pw.no')}</span>
        </li>
      ))}
    </ul>
  );
}
