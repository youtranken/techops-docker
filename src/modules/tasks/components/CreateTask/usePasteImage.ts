'use client';

import { useEffect, useRef } from 'react';

/**
 * Listen window-level `paste` event và detect image trong clipboard.
 * Khi user paste image (vd sau Win+Shift+S → Ctrl+V), gọi onImage(file).
 *
 * Dùng useRef để giữ stable listener — callback inline mỗi render KHÔNG
 * gây re-attach listener (chống memory leak).
 */
export function usePasteImage(enabled: boolean, onImage: (file: File) => void) {
  const callbackRef = useRef(onImage);
  // Giữ ref đến callback mới nhất, KHÔNG trigger effect re-attach
  useEffect(() => {
    callbackRef.current = onImage;
  }, [onImage]);

  useEffect(() => {
    if (!enabled) return;

    function handler(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (!blob) continue;
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          const file = new File([blob], `screenshot-${Date.now()}.${ext}`, { type: blob.type });
          e.preventDefault();
          callbackRef.current(file);
          return;
        }
      }
    }

    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [enabled]);
}
