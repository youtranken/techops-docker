import { requireMenuAccess } from '@/lib/settings-guard';

export default async function HelpdeskLayout({ children }: { children: React.ReactNode }) {
  await requireMenuAccess('helpdesk');
  return <>{children}</>;
}
