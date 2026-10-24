import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/modules/auth/components/LoginForm';
import { safeCallbackUrl } from '@/modules/auth/lib/auth-logic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('app.name')} · ${t('au.login.t')}` };
}

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) redirect('/'); // V1

  const { callbackUrl } = await searchParams;
  // Chỉ nhận đường dẫn nội bộ (V1 đẩy thẳng mọi giá trị → open-redirect). Trống/không hợp lệ → '/' như V1.
  return <LoginForm callbackUrl={safeCallbackUrl(callbackUrl)} />;
}
