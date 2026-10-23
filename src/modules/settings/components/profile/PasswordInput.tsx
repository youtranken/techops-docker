'use client';

/** Ô mật khẩu có nút hiện/ẩn (preview `.pw .icon-btn`). Nhận id/aria-* từ <Field> rồi chuyển cho <input>. */
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
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

export function PasswordInput({ value, onChange, autoComplete, extraDescribedBy, id, ...aria }: Props) {
  const t = useTranslations();
  const [show, setShow] = useState(false);
  const describedBy = [aria['aria-describedby'], extraDescribedBy].filter(Boolean).join(' ') || undefined;
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={aria['aria-invalid']}
        aria-required={aria['aria-required']}
        aria-describedby={describedBy}
        className={cn(inputClass, 'pr-11')}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        aria-label={t(show ? 'au.hide' : 'au.show')}
        className="absolute right-px top-px grid size-9 place-items-center rounded-ctl text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[680px]:size-[42px]"
      >
        {show ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
