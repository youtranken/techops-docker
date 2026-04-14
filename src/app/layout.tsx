import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

// Start cron jobs on server boot (server-side only)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  import('@/lib/cron/deadline-reminder').then(({ startDeadlineReminderCron }) => {
    startDeadlineReminderCron();
  });
  import('@/lib/cron/helpdesk-sync').then(({ startHelpdeskSyncCron }) => {
    startHelpdeskSyncCron();
  });
  import('@/lib/cron/digest').then(({ startDigestCron }) => {
    startDigestCron();
  });
  import('@/lib/cron/log-archive').then(({ startLogArchiveCron }) => {
    startLogArchiveCron();
  });
  import('@/lib/cron/overdue-reminder').then(({ startOverdueReminderCron }) => {
    startOverdueReminderCron();
  });
}

export const metadata: Metadata = {
  title: 'TechOps',
  description: 'TechOps - Task Management & HR System',
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
