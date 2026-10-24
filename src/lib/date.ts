import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

export default dayjs;

/**
 * Parse date string safely. Returns undefined for invalid dates.
 * Accepts: ISO 8601, YYYY-MM-DD, or any dayjs-parseable format.
 */
export function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.toDate() : undefined;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const VN_OFFSET = '+07:00';

/** Ô ngày 'YYYY-MM-DD' → 00:00 giờ VN của ngày đó; chuỗi có giờ thì giữ nguyên thời điểm. */
export function parseDayStart(value: string | null | undefined): Date | undefined {
  if (value && YMD.test(value)) return new Date(`${value}T00:00:00.000${VN_OFFSET}`);
  return parseDate(value);
}

/** Ô ngày 'YYYY-MM-DD' → 23:59:59.999 giờ VN của ngày đó (gồm trọn ngày cuối kỳ). */
export function parseDayEnd(value: string | null | undefined): Date | undefined {
  if (value && YMD.test(value)) return new Date(`${value}T23:59:59.999${VN_OFFSET}`);
  return parseDate(value);
}
