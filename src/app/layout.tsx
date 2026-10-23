import type { Metadata } from 'next';
import { JetBrains_Mono, Lexend, Noto_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { APP_TIMEZONE } from '@/i18n/format';
import './globals.css';

// DS v2: Lexend (tiêu đề, số lớn) · Noto Sans (nội dung) · JetBrains Mono (mã, số).
// next/font tự host lúc build (cần mạng khi `next build`), không gọi Google lúc chạy.
// Biến --ff-* được Tailwind dùng trong globals.css (font-sans/font-head/font-mono).
const fontHead = Lexend({
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--ff-head',
});
const fontBody = Noto_Sans({
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--ff-body',
});
const fontMono = JetBrains_Mono({
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--ff-mono',
});

export const metadata: Metadata = {
  title: 'TechOps',
  description: 'TechOps - Task Management & HR System',
  icons: {
    icon: '/logo-pmh.png',
    shortcut: '/logo-pmh.png',
    apple: '/logo-pmh.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ngôn ngữ theo cookie NEXT_LOCALE (src/i18n/config.ts); messages gửi xuống client cho useTranslations()
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${fontHead.variable} ${fontBody.variable} ${fontMono.variable}`}
    >
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={APP_TIMEZONE}>
          {children}
          <Toaster richColors position="top-right" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
