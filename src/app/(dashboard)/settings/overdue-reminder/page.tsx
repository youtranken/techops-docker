import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OverdueReminderSection } from '@/modules/settings/components/OverdueReminderSection';

export default async function OverdueReminderPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = (session.user as { role?: { name?: string } }).role?.name;
  if (!['ADMIN', 'BOSS'].includes(role ?? '')) redirect('/settings');
  return <OverdueReminderSection />;
}
