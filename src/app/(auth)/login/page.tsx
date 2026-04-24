import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/modules/auth/components/LoginForm';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session) {
    redirect('/');
  }

  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (60%) ── */}
      <div className="hidden lg:block lg:w-3/5 relative bg-slate-900 h-screen sticky top-0">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bg-login.jpg"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-slate-900/40" />

        {/* Top-left logo — no background, blends with image */}
        <div className="absolute top-10 left-10 flex items-center gap-3 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-pmh.png"
            alt="PMH Logo"
            className="w-14 h-14 object-contain drop-shadow-lg"
          />
          <span className="text-white text-xl font-bold tracking-wide drop-shadow-md">TechOps</span>
        </div>
      </div>

      {/* ── Right panel (40%) ── */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center bg-amber-50/60 dark:bg-gray-950 px-8 py-14 overflow-y-auto">
        <div className="w-full max-w-sm">

          {/* Logo — mobile only */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-pmh.png" alt="PMH Logo" className="w-12 h-12 object-contain" />
            <span className="text-stone-800 dark:text-white text-xl font-bold">TechOps</span>
          </div>

          {/* Greeting */}
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-stone-800 dark:text-white">Chào mừng trở lại 👋</h1>
          </div>

          <p className="text-sm text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
            Hệ thống quản lý công việc<br />
            <span className="text-stone-400 text-xs">Phú Mỹ Hưng Corporation</span>
          </p>

          <div className="space-y-1">
            <LoginForm callbackUrl={callbackUrl || '/'} />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-stone-400 dark:text-stone-600 mt-10 leading-relaxed">
            © 2026 Techops - IT PMH
            <br />
            <span className="italic">Version 2.0</span>
          </p>
        </div>
      </div>
    </div>
  );
}
