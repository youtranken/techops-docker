import { requireMenuAccess } from '@/lib/settings-guard';

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireMenuAccess('analytics');
  return <>{children}</>;
}
