import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FirstChangePassword } from '@/modules/auth/components/FirstChangePassword';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('app.name')} · ${t('au.first.t')}` };
}

export default function ChangePasswordPage() {
  return <FirstChangePassword />;
}
