/**
 * Định dạng ngày/số theo ngôn ngữ giao diện — helper DÙNG CHUNG (hàm thuần, chạy được cả server/client).
 *   vi: 23/10/2026 · 23/10 · 1.248 · 92,4%
 *   en: Oct 23, 2026 · Oct 23 · 1,248 · 92.4%
 * Ngày luôn tính ở múi giờ app (không theo múi giờ máy người xem), giống `src/lib/date.ts`.
 * Trong component: `useFormat()` (src/i18n/useFormat.ts) gắn sẵn locale hiện tại.
 */
import { intlLocale, type Locale } from './locale';

/** Múi giờ app (VN và TH cùng UTC+7) — trùng `dayjs.tz.setDefault` trong `src/lib/date.ts`. */
export const APP_TIMEZONE = 'Asia/Bangkok';

type DateInput = Date | string | number | null | undefined;

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();
function memo<T extends Intl.DateTimeFormat | Intl.NumberFormat>(key: string, make: () => T): T {
  let f = cache.get(key) as T | undefined;
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ngày/tháng/năm số ở múi giờ cho trước (tự ghép, vì Intl vi-VN không ổn định dấu phân cách: "05-11" vs "05/11"). */
function ymdParts(d: Date, timeZone: string): { y: string; m: string; d: string } {
  const f = memo(`ymd|${timeZone}`, () =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }),
  ) as Intl.DateTimeFormat;
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day };
}

/** Ngày đầy đủ: vi `dd/MM/yyyy`, en `MMM d, yyyy`. Đầu vào rỗng/không hợp lệ → ''. */
export function formatDate(value: DateInput, locale: Locale, timeZone: string = APP_TIMEZONE): string {
  const d = toDate(value);
  if (!d) return '';
  if (locale !== 'en') {
    const p = ymdParts(d, timeZone);
    return `${p.d}/${p.m}/${p.y}`;
  }
  const f = memo(`d|en|${timeZone}`, () =>
    new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }),
  );
  return f.format(d);
}

/** Ngày ngắn (nhãn hạn): vi `dd/MM`, en `MMM d`. */
export function formatDayMonth(value: DateInput, locale: Locale, timeZone: string = APP_TIMEZONE): string {
  const d = toDate(value);
  if (!d) return '';
  if (locale !== 'en') {
    const p = ymdParts(d, timeZone);
    return `${p.d}/${p.m}`;
  }
  const f = memo(`dm|en|${timeZone}`, () => new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }));
  return f.format(d);
}

/** Số có phân cách hàng nghìn: vi `1.248`, en `1,248`. */
export function formatNumber(n: number, locale: Locale): string {
  return memo(`n|${locale}`, () => new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 })).format(n);
}

/** Tỉ lệ 0..1 → phần trăm, tối đa `digits` chữ số lẻ: vi `92,4%`, en `92.4%`. */
export function formatPercent(ratio: number, locale: Locale, digits = 1): string {
  return memo(`p|${locale}|${digits}`, () =>
    new Intl.NumberFormat(intlLocale(locale), { style: 'percent', maximumFractionDigits: digits }),
  ).format(ratio);
}
