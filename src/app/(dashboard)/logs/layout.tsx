import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { requireMenuAccess } from '@/lib/settings-guard';
import { ShieldCheck } from 'lucide-react';
import { LogsNav } from '@/modules/logs/components/shared/LogsNav';

export default async function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  await requireMenuAccess('logs');
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="p-2 rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Lịch sử hoạt động hệ thống
          </p>
        </div>
      </div>

      {/* Horizontal nav — URL-based */}
      <LogsNav />

      {/* Sub-page content */}
      <div>{children}</div>
    </div>
  );
}
