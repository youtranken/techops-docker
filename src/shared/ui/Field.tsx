'use client';

/**
 * Ô nhập theo preview `.field > .lbl(.req/.opt) + control + .err|.hint` (_SPEC §4.4: nhãn trên, lỗi dưới).
 * Con (input/textarea/select) nhận `id`, `aria-invalid`, `aria-describedby` tự động khi là 1 phần tử React.
 */
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  /** Hiện "(không bắt buộc)" — mặc định khi không required; tắt bằng `optional={false}` */
  optional?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Nội dung bên phải nhãn (vd bộ đếm ký tự) */
  aside?: React.ReactNode;
  /** Nhãn là <div> (nhóm control), không phải <label for> */
  asGroup?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, required, optional, hint, error, aside, asGroup, className, children }: FieldProps) {
  const t = useTranslations();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const showOpt = optional ?? !required;
  const Lbl = asGroup ? 'div' : 'label';

  const child = React.isValidElement<Record<string, unknown>>(children) && !asGroup
    ? React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })
    : children;

  return (
    <div className={cn('mb-4 last:mb-0', className)} data-field={id}>
      <div className="flex items-baseline justify-between gap-2">
        <Lbl
          {...(asGroup ? { id: `${id}-lbl` } : { htmlFor: id })}
          className="mb-1.5 block text-[13px] font-medium text-ink"
        >
          {label}
          {required && (
            <>
              {' '}<span className="text-danger" aria-hidden="true">*</span>
              <span className="sr-only"> ({t('app.req')})</span>
            </>
          )}
          {showOpt && <span className="font-normal text-ink-3"> ({t('app.opt')})</span>}
        </Lbl>
        {aside}
      </div>
      {child}
      {hint && !error && <p id={hintId} className="m-0 mt-1.5 text-xs text-ink-3">{hint}</p>}
      {error && (
        <p id={errId} className="m-0 mt-1.5 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle aria-hidden className="size-3.5 flex-none" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Lớp cho textarea/input/select theo preview `.ta/.input/.select` (viền line-2, lỗi đỏ). */
export const controlClass = cn(
  'block w-full rounded-ctl border border-line-2 bg-surface px-2.5 text-sm text-ink placeholder:text-ink-3',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
  'aria-[invalid=true]:border-danger disabled:opacity-60',
);
export const inputClass = cn(controlClass, 'h-[38px] max-[680px]:h-11');
export const textareaClass = cn(controlClass, 'min-h-[104px] resize-y py-2 leading-normal');
