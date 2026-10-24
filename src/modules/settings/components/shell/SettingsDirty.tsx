'use client';

/**
 * Báo "mục đang có thay đổi chưa lưu" cho khung Cài đặt: chuyển mục bằng nav con thì hỏi trước (preview `set.leave.*`),
 * đóng/tải lại tab thì trình duyệt cảnh báo (beforeunload).
 */
import * as React from 'react';

interface Ctx {
  dirty: boolean;
  setDirty: (v: boolean) => void;
}
const DirtyCtx = React.createContext<Ctx>({ dirty: false, setDirty: () => {} });

export function SettingsDirtyProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = React.useState(false);
  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
  const value = React.useMemo(() => ({ dirty, setDirty }), [dirty]);
  return <DirtyCtx.Provider value={value}>{children}</DirtyCtx.Provider>;
}

export const useSettingsDirtyState = () => React.useContext(DirtyCtx);

/** Trang có form gọi hook này với cờ dirty của mình */
export function useReportDirty(dirty: boolean) {
  const { setDirty } = React.useContext(DirtyCtx);
  React.useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
}
