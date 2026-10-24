import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OverduePage } from '@/modules/settings/components/config/OverduePage';

export default async function OverdueReminderPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: { name?: string } }).role?.name;
  if (!['ADMIN', 'BOSS'].includes(role ?? '')) redirect('/settings');
  return <OverduePage />;
}
