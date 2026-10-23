/**
 * Tiện ích test: render component trong NextIntlClientProvider với messages thật (messages/*.json).
 * Dùng thay `render` của Testing Library cho component có gọi useTranslations().
 *   render(<Pagination … />)                 // mặc định vi
 *   render(<Pagination … />, { locale: 'en' })
 */
import * as React from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import viMessages from '../../messages/vi.json';
import enMessages from '../../messages/en.json';
import type { Locale } from '@/i18n/locale';
import { APP_TIMEZONE } from '@/i18n/format';

export const TEST_MESSAGES = { vi: viMessages, en: enMessages } as const;

export function IntlWrapper({ locale = 'vi', children }: { locale?: Locale; children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={TEST_MESSAGES[locale]} timeZone={APP_TIMEZONE}>
      {children}
    </NextIntlClientProvider>
  );
}

export function render(ui: React.ReactElement, { locale = 'vi', ...opts }: Omit<RenderOptions, 'wrapper'> & { locale?: Locale } = {}) {
  return rtlRender(ui, {
    wrapper: ({ children }) => <IntlWrapper locale={locale}>{children}</IntlWrapper>,
    ...opts,
  });
}
