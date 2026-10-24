'use client';

/** Ô mật khẩu có nút hiện/ẩn (preview `.pw .icon-btn`). Nhận id/aria-* từ <Field> rồi chuyển cho <input>.
 *  Dùng ở Hồ sơ (A3-2) và các trang Đăng nhập / Mật khẩu (A3-8). */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClass } from '@/shared/ui/Field';

interface Props {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  /** id thêm vào aria-describedby (vd danh sách yêu cầu) */
  extraDescribedBy?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Ẩn nút hiện/ẩn (ô nhập lại mật khẩu theo preview) */
  noToggle?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

export function PasswordInput({ value, onChange, autoComplete, extraDescribedBy, id, name, disabled, noToggle, ...aria }: Props) {
  const t = useTranslations();
  const [show, setShow] = useState(false);
  const describedBy = [aria['aria-describedby'], extraDescribedBy].filter(Boolean).join(' ') || undefined;
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={aria['aria-invalid']}
        aria-required={aria['aria-required']}
        aria-describedby={describedBy}
        className={cn(inputClass, !noToggle && 'pr-11')}
      />
      {!noToggle && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          disabled={disabled}
          aria-pressed={show}
          aria-label={t(show ? 'au.hide' : 'au.show')}
          className="absolute right-px top-px grid size-9 place-items-center rounded-ctl text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 max-[680px]:size-[42px]"
        >
          {show ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      )}
    </div>
  );
}
