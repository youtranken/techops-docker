/**
 * Ngôn ngữ giao diện (A1.3). Không đổi URL: lựa chọn lưu ở cookie `NEXT_LOCALE`, không lưu DB.
 * Dùng được ở cả server (request config) và client (nút đổi ngôn ngữ).
 */
export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'vi';
export const LOCALE_COOKIE = 'NEXT_LOCALE';
/** 1 năm */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Giá trị cookie → locale hợp lệ; thiếu hoặc lạ → mặc định `vi`. */
export function resolveLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Chuỗi gán cho `document.cookie` khi người dùng đổi ngôn ngữ. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Mã BCP 47 cho Intl.* */
export function intlLocale(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'vi-VN';
}

/** Hàm dịch tối giản (tương thích `useTranslations()` / `createTranslator()` của next-intl) — dùng cho hàm thuần. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;
