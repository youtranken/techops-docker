'use client';

/**
 * Hook trả hàm đổi lỗi → câu dễ hiểu theo ngôn ngữ hiện tại (bọc toUserMessage).
 *   const errMsg = useErrorMessage();
 *   onError: (err) => toast.error(errMsg(err))
 *   toast.error(errMsg(err, 'Lỗi khi lưu'))   // fallback tiếng Việt cũ của màn (vi hiện nguyên, en hiện câu chung)
 */
import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { resolveLocale } from '@/i18n/locale';
import { toUserMessage } from './errors';

export function useErrorMessage() {
  const t = useTranslations();
  const locale = resolveLocale(useLocale());
  return useCallback((err: unknown, fallback?: string) => toUserMessage(err, t, { locale, fallback }), [t, locale]);
}
