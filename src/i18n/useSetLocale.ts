'use client';

/** Đổi ngôn ngữ giao diện: ghi cookie NEXT_LOCALE rồi router.refresh() (server render lại với messages mới). */
import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { localeCookie, type Locale } from './locale';

export function useSetLocale() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const setLocale = useCallback(
    (locale: Locale) => {
      document.cookie = localeCookie(locale);
      startTransition(() => router.refresh());
    },
    [router],
  );
  return { setLocale, pending };
}
