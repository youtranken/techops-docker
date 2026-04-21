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
