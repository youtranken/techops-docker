'use client';

/**
 * Màn lỗi dùng chung (preview ds-v2 errors.html — `.state.page`): 404 · 403 · 500.
 * - `NotFoundScreen` cho not-found.tsx · `ForbiddenScreen` cho trang tự hiện "không có quyền" · `ServerErrorScreen` cho error.tsx.
 * Chỉ là giao diện — không đổi logic chặn quyền (các trang V1 vẫn redirect như cũ).
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileQuestion, Lock, ServerCrash, ArrowLeft, RotateCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Kind = '404' | '403' | '500';
const ICON: Record<Kind, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  '404': FileQuestion,
  '403': Lock,
  '500': ServerCrash,
};

export interface ErrorScreenProps {
  kind: Kind;
  /** 500: nút Thử lại */
  onRetry?: () => void;
  /** 500: mã lỗi kỹ thuật (error.digest) để gửi IT */
  code?: string;
  /** hiển thị toàn trang (ngoài khung app) */
  standalone?: boolean;
  className?: string;
}

export function ErrorScreen({ kind, onRetry, code, standalone, className }: ErrorScreenProps) {
  const t = useTranslations();
  const router = useRouter();
  const Icon = ICON[kind];
  const bad = kind === '500';
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  const desc = kind === '404' ? t('er.404.d') : kind === '403' ? t('er.403.dShort') : t('er.500.dShort');

  async function copyCode() {
    try { await navigator.clipboard.writeText(code ?? ''); } catch { /* bỏ qua */ }
    toast.info(t('er.copied'));
  }

  return (
    <div
      role={bad ? 'alert' : 'status'}
      className={cn(
        'mx-auto flex max-w-[560px] flex-col items-center justify-center px-6 py-14 text-center max-sm:px-2 max-sm:py-12',
        standalone ? 'min-h-dvh' : 'min-h-[calc(100dvh-56px-120px)] max-sm:min-h-0',
        className,
      )}
    >
      <Icon aria-hidden className={cn('mb-3 size-9 stroke-[1.5]', bad ? 'text-danger' : 'text-ink-3')} />
      <p aria-hidden className="m-0 mb-2.5 font-mono text-xs font-medium tracking-[.06em] text-ink-3">{kind}</p>
      <h1 ref={headingRef} tabIndex={-1} className="m-0 mb-2 font-head text-xl font-semibold leading-snug tracking-tight text-ink focus:outline-none">
        {t(`er.${kind}.t`)}
      </h1>
      <p className="m-0 max-w-[440px] text-sm leading-relaxed text-ink-2">{desc}</p>

      {bad && code && (
        <div className="mt-[18px] inline-flex max-w-full items-center gap-1.5 rounded-ctl border border-line bg-surface py-1 pl-3 pr-1 text-[13px] text-ink-2">
          <span>{t('er.code')}:</span>
          <span className="font-mono text-ink [overflow-wrap:anywhere]">{code}</span>
          <button
            type="button"
            onClick={copyCode}
            aria-label={t('er.copy')}
            title={t('er.copy')}
            className="grid size-[30px] place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <Copy aria-hidden className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2 max-sm:w-full max-sm:max-w-[320px] max-sm:flex-col max-sm:items-stretch">
        {bad && onRetry ? (
          <>
            <Button type="button" size="md" onClick={onRetry}>
              <RotateCw aria-hidden />
              {t('app.retry')}
            </Button>
            <Button asChild variant="outline" size="md">
              <Link href="/tasks">{t('er.home')}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild size="md">
              <Link href="/tasks">
                <ArrowLeft aria-hidden />
                {t('er.home')}
              </Link>
            </Button>
            {kind === '404' && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => (window.history.length > 1 ? router.back() : router.push('/tasks'))}
              >
                {t('er.back')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export const NotFoundScreen = (p: Omit<ErrorScreenProps, 'kind'>) => <ErrorScreen kind="404" {...p} />;
export const ForbiddenScreen = (p: Omit<ErrorScreenProps, 'kind'>) => <ErrorScreen kind="403" {...p} />;
export const ServerErrorScreen = (p: Omit<ErrorScreenProps, 'kind'>) => <ErrorScreen kind="500" {...p} />;
