import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SmtpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role?.name !== 'ADMIN') redirect('/');
  return <>{children}</>;
}
