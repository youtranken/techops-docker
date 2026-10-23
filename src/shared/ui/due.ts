/**
 * Hạn chót → tông màu + nhãn (DS v2 `.due-*`). Hàm thuần, không phụ thuộc React.
 * "Hôm nay" tính theo NGÀY LỊCH ở múi giờ app (giống `src/lib/date.ts`), không theo UTC.
 * Nhãn trả về dạng KHOÁ `due.*` + giá trị (A1.3); dịch bằng `dueLabel(info, t)`.
 */
import type { TaskStatus } from '@prisma/client';
import { APP_TIMEZONE, formatDayMonth } from '@/i18n/format';
import type { Locale, Translate } from '@/i18n/locale';

export { APP_TIMEZONE };

export type DueTone = 'overdue' | 'soon' | 'near' | 'calm' | 'done' | 'none';
export type DueKey = 'due.overdue' | 'due.today' | 'due.tomorrow' | 'due.in' | 'due.on' | 'due.none';
export interface DueInfo {
  tone: DueTone;
  /** Khoá messages của nhãn */
  key: DueKey;
  /** Tham số của nhãn: n (số ngày) hoặc d (ngày đã định dạng theo locale) */
  values?: { n?: number; d?: string };
  /** Số ngày lịch từ hôm nay tới hạn (âm = trễ); null khi không có hạn. */
  days: number | null;
}

export interface DueOptions {
  /** Ngôn ngữ để định dạng ngày trong nhãn "Hạn dd/MM" / "Due MMM d"; mặc định vi */
  locale?: Locale;
  timeZone?: string;
}

type DateInput = Date | string | number | null | undefined;

const ymdFmt = new Map<string, Intl.DateTimeFormat>();
function ymd(d: Date, timeZone: string): { y: number; m: number; d: number } {
  let f = ymdFmt.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    ymdFmt.set(timeZone, f);
  }
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Chênh lệch ngày lịch (target − now) ở múi giờ cho trước. */
export function dayDiffInZone(target: Date, now: Date, timeZone: string = APP_TIMEZONE): number {
  const a = ymd(target, timeZone);
  const b = ymd(now, timeZone);
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000);
}

function toneFor(days: number): DueTone {
  if (days < 0) return 'overdue';
  if (days <= 3) return 'soon';
  if (days <= 7) return 'near';
  return 'calm';
}

/** Tông hạn: việc đã xong → done, đã hủy hoặc không có hạn → none (không cảnh báo). */
export function dueTone(dueDate: DateInput, now: Date, status: TaskStatus | string, timeZone: string = APP_TIMEZONE): DueTone {
  return dueInfo(dueDate, now, status, { timeZone }).tone;
}

/**
 * Tông + khoá nhãn: due.overdue {n} ("Trễ n ngày") · due.today · due.tomorrow · due.in {n} ("Còn n ngày")
 * · due.on {d} ("Hạn dd/MM" / "Due MMM d") · due.none.
 */
export function dueInfo(dueDate: DateInput, now: Date, status: TaskStatus | string, opts: DueOptions = {}): DueInfo {
  const { locale = 'vi', timeZone = APP_TIMEZONE } = opts;
  const due = toDate(dueDate);
  if (!due) return { tone: 'none', key: 'due.none', days: null };

  const days = dayDiffInZone(due, now, timeZone);
  const onDate = { key: 'due.on' as const, values: { d: formatDayMonth(due, locale, timeZone) } };

  if (status === 'COMPLETED') return { tone: 'done', ...onDate, days };
  if (status === 'CANCELLED') return { tone: 'none', ...onDate, days };

  const tone = toneFor(days);
  if (days < 0) return { tone, key: 'due.overdue', values: { n: -days }, days };
  if (days === 0) return { tone, key: 'due.today', days };
  if (days === 1) return { tone, key: 'due.tomorrow', days };
  if (days <= 7) return { tone, key: 'due.in', values: { n: days }, days };
  return { tone, ...onDate, days };
}

/** Nhãn hạn đã dịch. */
export function dueLabel(info: DueInfo, t: Translate): string {
  return t(info.key, info.values as Record<string, string | number> | undefined);
}
