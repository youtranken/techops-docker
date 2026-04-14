import { requireMenuAccess } from '@/lib/settings-guard';

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  await requireMenuAccess('hr');
  return <>{children}</>;
}
