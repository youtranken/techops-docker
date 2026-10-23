/**
 * Hạn chót → tông màu + nhãn (DS v2 `.due-*`). Hàm thuần, không phụ thuộc React.
 * "Hôm nay" tính theo NGÀY LỊCH ở múi giờ app (giống `src/lib/date.ts`), không theo UTC.
 */
import type { TaskStatus } from '@prisma/client';

/** Múi giờ app (VN và TH cùng UTC+7) — trùng `dayjs.tz.setDefault` trong `src/lib/date.ts`. */
export const APP_TIMEZONE = 'Asia/Bangkok';

export type DueTone = 'overdue' | 'soon' | 'near' | 'calm' | 'done' | 'none';
export interface DueInfo {
  tone: DueTone;
  label: string;
  /** Số ngày lịch từ hôm nay tới hạn (âm = trễ); null khi không có hạn. */
  days: number | null;
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
  return dueInfo(dueDate, now, status, timeZone).tone;
}

/** Tông + nhãn tiếng Việt: "Trễ n ngày" · "Hạn hôm nay" · "Hạn ngày mai" · "Còn n ngày" · "Hạn dd/MM". */
export function dueInfo(dueDate: DateInput, now: Date, status: TaskStatus | string, timeZone: string = APP_TIMEZONE): DueInfo {
  const due = toDate(dueDate);
  if (!due) return { tone: 'none', label: 'Chưa có hạn', days: null };

  const days = dayDiffInZone(due, now, timeZone);
  const { m, d } = ymd(due, timeZone);
  const onDate = `Hạn ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;

  if (status === 'COMPLETED') return { tone: 'done', label: onDate, days };
  if (status === 'CANCELLED') return { tone: 'none', label: onDate, days };

  const tone = toneFor(days);
  let label: string;
  if (days < 0) label = `Trễ ${-days} ngày`;
  else if (days === 0) label = 'Hạn hôm nay';
  else if (days === 1) label = 'Hạn ngày mai';
  else if (days <= 7) label = `Còn ${days} ngày`;
  else label = onDate;
  return { tone, label, days };
}
