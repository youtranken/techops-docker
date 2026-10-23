'use client';

/**
 * Hộp hỏi khi đóng biểu mẫu có thay đổi (preview `ask3`): [Bỏ] … [Tiếp tục sửa] [Lưu nháp].
 * Không có `onSave` (form Sửa) → chỉ [Bỏ thay đổi] [Tiếp tục sửa]. Esc / bấm nền = Tiếp tục sửa.
 */
import * as React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChoiceDialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  note?: React.ReactNode;
  discardLabel: string;
  onDiscard: () => void;
  onKeep: () => void;
  saveLabel?: string;
  onSave?: () => void;
}

export function ChoiceDialog({ open, title, description, note, discardLabel, onDiscard, onKeep, saveLabel, onSave }: ChoiceDialogProps) {
  const t = useTranslations();
  const saveRef = React.useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => { if (!v) onKeep(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[80] bg-scrim-dlg data-[state=open]:animate-in data-[state=open]:fade-in-0" onClick={onKeep} />
        <AlertDialog.Content
          data-testid="tf-ask"
          onOpenAutoFocus={(e) => { if (saveRef.current) { e.preventDefault(); saveRef.current.focus(); } }}
          onEscapeKeyDown={(e) => { e.preventDefault(); onKeep(); }}
          className={cn(
            'v2-pop fixed z-[81] flex flex-col border border-line bg-surface text-ink shadow-v2-pop',
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-b-0',
            'min-[681px]:inset-x-auto min-[681px]:bottom-auto min-[681px]:left-1/2 min-[681px]:top-1/2 min-[681px]:w-[min(460px,calc(100%-32px))] min-[681px]:-translate-x-1/2 min-[681px]:-translate-y-1/2 min-[681px]:rounded-card min-[681px]:border-b',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none',
          )}
        >
          <div className="px-5 pb-1 pt-4">
            <AlertDialog.Title className="m-0 flex items-center font-head text-[17px] font-semibold leading-[1.35]">
              {title}
            </AlertDialog.Title>
          </div>
          <AlertDialog.Description className="px-5 pb-1 pt-1.5 text-sm text-ink-2">{description}</AlertDialog.Description>
          {note && <p className="m-0 px-5 pb-1 pt-1 text-xs text-ink-3">{note}</p>}
          <div className="mt-3 flex items-center gap-2 border-t border-line px-4 py-3 max-[680px]:flex-wrap max-[680px]:pb-[max(12px,env(safe-area-inset-bottom))]">
            <Button type="button" variant="neg" size="md" onClick={onDiscard} className="max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1">{discardLabel}</Button>
            <span className="flex-1 max-[680px]:hidden" />
            <Button type="button" variant="outline" size="md" onClick={onKeep} className="max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1">{t('dr.ask.keep')}</Button>
            {onSave && saveLabel && (
              <Button ref={saveRef} type="button" size="md" onClick={onSave} className="max-[680px]:h-11 max-[680px]:min-w-0 max-[680px]:flex-1">
                {saveLabel}
              </Button>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
