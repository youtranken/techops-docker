'use client';

/** Helper định dạng ngày/số gắn sẵn ngôn ngữ hiện tại (xem src/i18n/format.ts). */
import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { resolveLocale } from './locale';
import { formatDate, formatDayMonth, formatNumber, formatPercent } from './format';

export function useFormat() {
  const locale = resolveLocale(useLocale());
  return useMemo(
    () => ({
      locale,
      date: (v: Date | string | number | null | undefined) => formatDate(v, locale),
      dayMonth: (v: Date | string | number | null | undefined) => formatDayMonth(v, locale),
      number: (n: number) => formatNumber(n, locale),
      percent: (ratio: number, digits?: number) => formatPercent(ratio, locale, digits),
    }),
    [locale],
  );
}
