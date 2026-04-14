'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FieldError } from './FieldError';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateTaskInput } from '../../validators/create-task.schema';

interface TitleInputProps {
  register: UseFormRegister<CreateTaskInput>;
  errors: FieldErrors<CreateTaskInput>;
}

export function TitleInput({ register, errors }: TitleInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!errors.title;

  return (
    <div className="space-y-1.5">
      <label htmlFor="title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Tiêu đề <span className="text-red-500">*</span>
      </label>

      <div
        className={cn(
          'rounded-lg border-2 px-3 py-2.5 transition-all duration-200 bg-white dark:bg-slate-800',
          focused
            ? 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
            : hasError
              ? 'border-red-400'
              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
        )}
      >
        <input
          id="title"
          placeholder="Nhập tiêu đề công việc..."
          className="w-full text-sm font-medium placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none text-slate-900 dark:text-slate-100"
          {...register('title', { onBlur: () => setFocused(false) })}
          onFocus={() => setFocused(true)}
        />
      </div>

      <FieldError message={errors.title?.message} />
    </div>
  );
}
