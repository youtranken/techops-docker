'use client';

/**
 * Hộp xác nhận dạng promise — thay `window.confirm`.
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, description, confirmText: 'Xóa', danger: true }))) return;
 * Đồng ý → true; "Đóng", Esc, bấm nền → false. Nút đóng luôn ghi "Đóng" (_SPEC §4.2).
 * Cần <ConfirmProvider> bao ngoài (đã gắn ở layout dashboard).
 */
import * as React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Chữ nút chính, mặc định "Xác nhận" */
  confirmText?: string;
  /** Chữ nút đóng, mặc định "Đóng" */
  closeText?: string;
  /** Hành động phá huỷ → nút chính màu đỏ */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = React.useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm() phải nằm trong <ConfirmProvider>');
  return fn;
}

interface Pending {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [open, setOpen] = React.useState(false);
  const pendingRef = React.useRef<Pending | null>(null);
  // Hộp không có Trigger của Radix → tự nhớ phần tử đang focus để trả focus khi đóng
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const settle = React.useCallback((ok: boolean) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setOpen(false);
    p?.resolve(ok);
  }, []);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    // Hộp cũ còn treo (hiếm) → coi như đóng
    pendingRef.current?.resolve(false);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      returnFocusRef.current = document.activeElement;
    }
    return new Promise<boolean>((resolve) => {
      const p = { opts, resolve };
      pendingRef.current = p;
      setPending(p);
      setOpen(true);
    });
  }, []);

  // Huỷ promise đang treo khi provider bị gỡ
  React.useEffect(() => () => pendingRef.current?.resolve(false), []);

  const o = pending?.opts;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={(v) => { if (!v) settle(false); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-scrim-dlg data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <AlertDialog.Content
            className={cn(
              'v2-pop fixed z-[81] flex flex-col border border-line bg-surface text-ink shadow-v2-pop',
              // ≥681: giữa màn, rộng 420; ≤680: trượt từ dưới, full ngang
              'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-b-0',
              'min-[681px]:inset-x-auto min-[681px]:bottom-auto min-[681px]:left-1/2 min-[681px]:top-1/2 min-[681px]:w-[min(420px,calc(100%-32px))] min-[681px]:-translate-x-1/2 min-[681px]:-translate-y-1/2 min-[681px]:rounded-card min-[681px]:border-b',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none',
            )}
            onEscapeKeyDown={() => settle(false)}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              const el = returnFocusRef.current;
              returnFocusRef.current = null;
              if (el?.isConnected) el.focus();
            }}
          >
            <div className="px-5 pb-1 pt-4">
              <AlertDialog.Title className="m-0 font-head text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] [overflow-wrap:anywhere]">
                {o?.title}
              </AlertDialog.Title>
            </div>
            <AlertDialog.Description
              className={o?.description ? 'overflow-y-auto px-5 pb-[18px] pt-1.5 text-sm text-ink-2' : 'sr-only'}
            >
              {o?.description ?? (typeof o?.title === 'string' ? o.title : t('ui.confirm'))}
            </AlertDialog.Description>
            <div className="flex justify-end gap-2 border-t border-line px-4 py-3 max-[680px]:pb-[max(12px,env(safe-area-inset-bottom))] max-[680px]:[&>button]:flex-1">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="outline" size="md">
                  {o?.closeText ?? t('app.close')}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  type="button"
                  size="md"
                  variant={o?.danger ? 'danger' : 'default'}
                  data-variant={o?.danger ? 'danger' : 'default'}
                  onClick={(e) => { e.preventDefault(); settle(true); }}
                >
                  {o?.confirmText ?? t('ui.confirm')}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
