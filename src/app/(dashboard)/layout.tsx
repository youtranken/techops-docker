import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuthProvider } from '@/shared/providers/AuthProvider';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { ThemeProvider } from '@/shared/providers/ThemeProvider';
import { IdleTimeoutProvider } from '@/shared/providers/IdleTimeoutProvider';
import { DashboardShell } from '@/shared/layout/DashboardShell';
import { ConfirmProvider } from '@/shared/ui/ConfirmDialog';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <AuthProvider session={session}>
      <QueryProvider>
        <ThemeProvider>
          <IdleTimeoutProvider>
            <ConfirmProvider>
              <DashboardShell
                displayName={session.user.displayName}
                roleName={session.user.role.name}
              >
                {children}
              </DashboardShell>
            </ConfirmProvider>
          </IdleTimeoutProvider>
        </ThemeProvider>
      </QueryProvider>
    </AuthProvider>
  );
}