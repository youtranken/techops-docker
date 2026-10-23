'use client';

/**
 * Khung hộp thoại hành động V2 (preview `App.dialog` + `.dlg .dlg-h .dlg-b .dlg-f .tk .note`).
 *   <ActionDialog open onClose title sub size okLabel onOk danger pending task={{code,title}}> …body… </ActionDialog>
 * - Footer luôn [Đóng][nút chính] căn phải (_SPEC §4.2: nút đóng ghi "Đóng"); `extraActions` chen giữa.
 * - Esc / bấm nền / nút X = Đóng. Đang gửi (`pending`): khoá Đóng + nút chính, chặn Esc/bấm nền.
 * - Mở ra focus ô nhập đầu tiên trong thân hộp (không có thì focus nút chính).
 * - ≤680px: trượt từ đáy, full ngang, nút cao 44px.
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { Info, AlertTriangle, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Thẻ tóm tắt việc (mã + tiêu đề) ở đầu thân hộp */
  task?: { code?: string | null; title: string } | null;
  okLabel?: React.ReactNode;
  onOk?: () => void;
  danger?: boolean;
  pending?: boolean;
  /** Khoá nút chính (hiếm khi cần: lỗi kiểm tra hiện inline, không khoá nút) */
  okDisabled?: boolean;
  extraActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

const W = { sm: 'min-[681px]:w-[min(420px,calc(100%-32px))]', md: 'min-[681px]:w-[min(500px,calc(100%-32px))]', lg: 'min-[681px]:w-[min(720px,calc(100%-32px))]' };
const FOCUSABLE = 'textarea:not([disabled]), input:not([type=file]):not([type=checkbox]):not([type=radio]):not([disabled]), select:not([disabled])';

export function ActionDialog({
  open, onClose, title, sub, size = 'md', task, okLabel, onOk, danger, pending, okDisabled, extraActions, children, className,
  'data-testid': testId,
}: ActionDialogProps) {
  const t = useTranslations();
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const okRef = React.useRef<HTMLButtonElement>(null);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);

  const requestClose = () => { if (!pending) onClose(); };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) requestClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-scrim-dlg data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          data-testid={testId}
          data-size={size}
          aria-describedby={undefined}
          className={cn(
            'v2-pop fixed z-[71] flex flex-col border border-line bg-surface text-ink shadow-v2-pop outline-none',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-b-0',
            'min-[681px]:inset-x-auto min-[681px]:bottom-auto min-[681px]:left-1/2 min-[681px]:top-1/2 min-[681px]:max-h-[calc(100dvh-32px)] min-[681px]:-translate-x-1/2 min-[681px]:-translate-y-1/2 min-[681px]:rounded-card min-[681px]:border-b',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 max-[680px]:data-[state=open]:slide-in-from-bottom-8 min-[681px]:data-[state=open]:zoom-in-[0.98] motion-reduce:animate-none',
            W[size],
            className,
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const first = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE);
            (first ?? (okRef.current && !okRef.current.disabled ? okRef.current : closeBtnRef.current))?.focus();
          }}
          onEscapeKeyDown={(e) => { if (pending) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (pending) e.preventDefault(); }}
          onInteractOutside={(e) => { if (pending) e.preventDefault(); }}
        >
          <div className="flex items-start gap-2 pb-1 pl-5 pr-3 pt-4">
            <div className="mt-[5px] min-w-0 flex-1">
              <DialogPrimitive.Title className="m-0 font-head text-[17px] font-semibold leading-[1.35] tracking-[-0.01em] [overflow-wrap:anywhere]">
                {title}
              </DialogPrimitive.Title>
              {sub && <p className="m-0 mt-0.5 font-body text-[13px] leading-[1.4] text-ink-3">{sub}</p>}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                disabled={pending}
                aria-label={t('tdx.dlg.closeX')}
                className="grid size-8 flex-none place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 max-[680px]:size-11"
              >
                <X aria-hidden className="size-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[18px] pt-1.5 text-sm text-ink-2 [&>p]:mb-3 [&>p]:mt-0 [&>p:last-child]:mb-0">
            {task && <TaskSummary code={task.code} title={task.title} />}
            {children}
          </div>

          <div
            data-slot="dlg-footer"
            className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 max-[680px]:flex-nowrap max-[680px]:pb-[max(12px,env(safe-area-inset-bottom))] max-[680px]:[&>button]:h-11 max-[680px]:[&>button]:min-w-0 max-[680px]:[&>button]:flex-1"
          >
            <Button ref={closeBtnRef} type="button" variant="outline" size="md" disabled={pending} onClick={requestClose}>
              {t('app.close')}
            </Button>
            {extraActions}
            {okLabel && onOk && (
              <Button
                ref={okRef}
                type="button"
                size="md"
                variant={danger ? 'danger' : 'default'}
                data-variant={danger ? 'danger' : 'default'}
                disabled={pending || okDisabled}
                aria-busy={pending || undefined}
                onClick={() => { if (!pending) onOk(); }}
              >
                {pending ? (<><Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />{t('tdx.processing')}</>) : okLabel}
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Thẻ tóm tắt việc (preview `.tk`): mã mono + tiêu đề. */
export function TaskSummary({ code, title }: { code?: string | null; title: string }) {
  return (
    <div data-testid="dlg-task" className="mb-4 mt-1 flex items-baseline gap-2 rounded-ctl bg-surface-2 px-3 py-[9px] text-[13px]">
      {code && <span className="flex-none font-mono text-xs text-ink-3">{code}</span>}
      <b className="min-w-0 font-medium text-ink [overflow-wrap:anywhere]">{title}</b>
    </div>
  );
}

const NOTE = {
  info: { Icon: Info, box: 'bg-[color-mix(in_srgb,var(--primary-soft)_60%,var(--surface))]', icon: 'text-primary-text' },
  warn: { Icon: AlertTriangle, box: 'bg-[color-mix(in_srgb,var(--c-review)_11%,var(--surface))]', icon: 'text-c-review' },
  bad: { Icon: AlertCircle, box: 'bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))]', icon: 'text-danger' },
} as const;

/** Ghi chú "điều gì xảy ra tiếp theo" (preview `.note` / `.note.warn` / `.note.bad`). */
export function DialogNote({ tone = 'info', icon: IconOverride, children, className }: {
  tone?: keyof typeof NOTE; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string;
}) {
  const n = NOTE[tone];
  const Icon = IconOverride ?? n.Icon;
  return (
    <div data-tone={tone} className={cn('mt-4 flex items-start gap-2 rounded-ctl px-3 py-2.5 text-[13px] text-ink first:mt-1', n.box, className)}>
      <Icon aria-hidden className={cn('mt-0.5 size-4 flex-none', n.icon)} />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
