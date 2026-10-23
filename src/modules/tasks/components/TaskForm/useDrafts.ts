'use client';

/**
 * Đọc danh sách nháp của user hiện tại (localStorage) và tự cập nhật khi nháp đổi
 * (cùng tab: sự kiện `techops:drafts`; tab khác: sự kiện `storage`).
 */
import { useMemo, useSyncExternalStore } from 'react';
import { browserStorage, draftKey, listDrafts, type TaskDraft } from './draft-store';

const EVT = 'techops:drafts';

/** Gọi sau mỗi lần lưu/xoá nháp để danh sách (tab Nháp) cập nhật. */
export function notifyDrafts() {
  try { window.dispatchEvent(new Event(EVT)); } catch { /* bỏ qua */ }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function useDrafts(userId: string): TaskDraft[] {
  // Ảnh chụp = chuỗi thô (ổn định giữa các lần gọi) → không render lặp
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      if (!userId) return '';
      try { return browserStorage()?.getItem(draftKey(userId)) ?? ''; } catch { return ''; }
    },
    () => '',
  );
  return useMemo(() => (raw ? listDrafts(userId) : []), [raw, userId]);
}
