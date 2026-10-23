import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AuthProvider } from '@/shared/providers/AuthProvider';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { ThemeProvider } from '@/shared/providers/ThemeProvider';
import { IdleTimeoutProvider } from '@/shared/providers/IdleTimeoutProvider';
import { DashboardShell, SIDEBAR_COOKIE } from '@/shared/layout/DashboardShell';
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
  // Sidebar thu gọn (desktop) — nhớ bằng cookie để server render đúng ngay, không nháy
  const initialCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === '1';

  return (
    <AuthProvider session={session}>
      <QueryProvider>
        <ThemeProvider>
          <IdleTimeoutProvider>
            <ConfirmProvider>
              <DashboardShell
                displayName={session.user.displayName}
                roleName={session.user.role.name}
                initialCollapsed={initialCollapsed}
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