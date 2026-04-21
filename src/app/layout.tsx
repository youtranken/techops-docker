import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';


export const metadata: Metadata = {
  title: 'TechOps',
  description: 'TechOps - Task Management & HR System',
  icons: {
    icon: '/logo-pmh.png',
    shortcut: '/logo-pmh.png',
    apple: '/logo-pmh.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}<Toaster richColors position="top-right" /></body>
    </html>
  );
}
