/**
 * Nhóm thông báo "Hôm nay" / "Trước đó" (preview ds-v2 dropdown chuông).
 * Mốc ngày tính theo múi giờ app (APP_TIMEZONE, UTC+7), không theo máy người xem.
 */
import { APP_TIMEZONE } from '@/i18n/format';

export interface Dated { createdAt: string | Date }

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function dayKey(d: Date, timeZone: string): string {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    fmtCache.set(timeZone, f);
  }
  return f.format(d); // yyyy-mm-dd
}

export function groupByDay<T extends Dated>(items: T[], now: Date, timeZone: string = APP_TIMEZONE): { today: T[]; earlier: T[] } {
  const todayKey = dayKey(now, timeZone);
  const today: T[] = [];
  const earlier: T[] = [];
  for (const it of items) {
    const d = it.createdAt instanceof Date ? it.createdAt : new Date(it.createdAt);
    if (!Number.isNaN(d.getTime()) && dayKey(d, timeZone) === todayKey) today.push(it);
    else earlier.push(it);
  }
  return { today, earlier };
}
