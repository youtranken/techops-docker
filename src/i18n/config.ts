/**
 * Cấu hình request của next-intl (A1.3). Ngôn ngữ lấy từ cookie `NEXT_LOCALE` (không đổi URL),
 * thiếu/lạ → `vi`. Được nạp qua `createNextIntlPlugin('./src/i18n/config.ts')` trong next.config.mjs.
 */
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE, resolveLocale } from './locale';
import { APP_TIMEZONE } from './format';

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    timeZone: APP_TIMEZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
