import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { requireMenuAccess } from '@/lib/settings-guard';
import { LogsHeader } from '@/modules/logs/components/LogsPage/LogsHeader';

/** Nhật ký V2 (A3-6). Quyền giữ V1: phải có menu `logs` (ADMIN/BOSS luôn có). */
export default async function LogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  await requireMenuAccess('logs');
  return (
    <div data-testid="lg-page">
      <LogsHeader />
      {children}
    </div>
  );
}
