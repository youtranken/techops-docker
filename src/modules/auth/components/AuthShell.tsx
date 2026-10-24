/**
 * Khung trang xác thực (preview login.html / password.html `.au`): không sidebar, căn giữa,
 * logo + tên, 1 thẻ ~400px, chân trang có đổi ngôn ngữ VI/EN + sáng/tối.
 */
import { getTranslations } from 'next-intl/server';
import { AuthFooter } from './AuthFooter';

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <main id="content" className="flex min-h-dvh flex-col items-center px-4 pb-24 pt-14 max-[480px]:pt-7">
      <div className="my-auto w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5 max-[480px]:mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-pmh.png" alt="PMH" className="size-9 object-contain" />
          <span>
            <b className="block font-head text-base font-semibold leading-tight tracking-tight text-ink">{t('app.name')}</b>
            <small className="block text-xs text-ink-3">{t('app.org')}</small>
          </span>
        </div>
        <section
          aria-labelledby="auT"
          className="rounded-card border border-line bg-surface p-7 shadow-v2-1 max-[480px]:px-[18px] max-[480px]:py-[22px]"
        >
          {children}
        </section>
        <AuthFooter />
      </div>
    </main>
  );
}
