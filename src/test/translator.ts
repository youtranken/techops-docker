/** Translator next-intl thật trên messages/*.json, kiểu nới thành `Translate` để dùng với hàm thuần trong test. */
import { createTranslator } from 'next-intl';
import viMessages from '../../messages/vi.json';
import enMessages from '../../messages/en.json';
import type { Locale, Translate } from '@/i18n/locale';

export type TestTranslator = Translate & { has: (key: string) => boolean };

export function translator(locale: Locale): TestTranslator {
  const messages = (locale === 'en' ? enMessages : viMessages) as Record<string, unknown>;
  return createTranslator({ locale, messages } as Parameters<typeof createTranslator>[0]) as unknown as TestTranslator;
}
