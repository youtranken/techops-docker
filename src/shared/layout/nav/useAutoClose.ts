'use client';

import { useEffect, useRef } from 'react';

/**
 * Ngăn kéo mobile: tự đóng khi đổi route (pathname + query) và khi bấm Esc.
 * `routeKey` nên gồm cả query (vd `/tasks?view=important`) vì mục ★/Mới xong chỉ khác query.
 */
export function useAutoClose(open: boolean, onClose: () => void, routeKey: string): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const lastRoute = useRef(routeKey);

  useEffect(() => {
    if (lastRoute.current === routeKey) return;
    lastRoute.current = routeKey;
    if (open) closeRef.current();
  }, [routeKey, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
}
