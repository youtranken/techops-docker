'use client';

/** Lời chào + dòng tóm tắt (preview `.db-head`). Số "đang chờ bạn" = tổng ô KPI 3 + 4 (số V1). */
import { useTranslations } from 'next-intl';
import { useFormat } from '@/i18n/useFormat';
import { greetingKey, hourOf, weekdayIndex } from '../view-model/dashboard-logic';

export function DashboardHead({ name, now, waiting, isBoss, empty }: {
  name: string; now: Date; waiting: number; isBoss: boolean; empty: boolean;
}) {
  const t = useTranslations();
  const f = useFormat();
  const d = `${t('db.wd').split('|')[weekdayIndex(now)]}, ${f.date(now)}`;
  const sub = empty ? t('db.sub.empty', { d })
    : !waiting ? t('db.sub.none', { d })
    : t(isBoss ? 'db.sub.boss' : 'db.sub.emp', { d, n: waiting });
  return (
    <div className="mb-4">
      <h1 className="m-0 font-head text-[22px] font-semibold leading-tight text-ink">{t(greetingKey(hourOf(now)), { n: name })}</h1>
      <p className="m-0 mt-1 text-[13px] text-ink-3" data-testid="db-sub">{sub}</p>
    </div>
  );
}
