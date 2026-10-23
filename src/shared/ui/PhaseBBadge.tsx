'use client';

/** Nhãn nhỏ "Phase B" (preview `.phase-b` / `App.phaseB()`): phần V1 chưa có backend. Viền nét đứt, chữ mono in hoa, không nền. */
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function PhaseBBadge({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <span
      title={t('app.phaseB.d')}
      className={cn('ml-1.5 inline-flex flex-none items-center rounded-[4px] border border-dashed border-line-2 px-1 py-px align-middle font-mono text-[10px] font-medium uppercase leading-[1.3] tracking-[.04em] text-ink-3', className)}
    >
      {t('app.phaseB._')}
    </span>
  );
}
