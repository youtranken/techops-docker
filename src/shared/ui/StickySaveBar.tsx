'use client';

/**
 * Thanh lưu dính đáy (preview settings `.savebar`): chỉ hiện khi có thay đổi chưa lưu.
 * ≥681: thẻ nổi dính đáy vùng nội dung; ≤680: tràn ngang, cố định đáy màn, nút cao 42.
 */
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StickySaveBarProps {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
  message?: string;
  saveText?: string;
  resetText?: string;
  className?: string;
}

export function StickySaveBar({
  dirty,
  onSave,
  onReset,
  saving = false,
  message = 'Bạn có thay đổi chưa lưu',
  saveText = 'Lưu thay đổi',
  resetText = 'Hoàn tác',
  className,
}: StickySaveBarProps) {
  if (!dirty) return null;
  return (
    <div
      role="region"
      aria-label={message}
      className={cn(
        'v2-pop sticky bottom-4 z-[25] mt-5 flex items-center gap-2.5 rounded-card border border-line-2 bg-surface py-2.5 pl-4 pr-3 shadow-v2-pop',
        'max-[680px]:fixed max-[680px]:inset-x-0 max-[680px]:bottom-0 max-[680px]:m-0 max-[680px]:rounded-none max-[680px]:border-x-0 max-[680px]:border-b-0 max-[680px]:px-4 max-[680px]:pb-[calc(10px+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-medium text-ink max-[680px]:hidden">
        <span aria-hidden className="size-2 flex-none rounded-full bg-c-review" />
        {message}
      </span>
      <Button type="button" variant="outline" size="md" disabled={saving} onClick={onReset} className="max-[680px]:h-[42px] max-[680px]:flex-1">
        <Undo2 aria-hidden />
        {resetText}
      </Button>
      <Button type="button" size="md" disabled={saving} onClick={onSave} className="max-[680px]:h-[42px] max-[680px]:flex-1">
        {saving ? 'Đang lưu…' : saveText}
      </Button>
    </div>
  );
}
