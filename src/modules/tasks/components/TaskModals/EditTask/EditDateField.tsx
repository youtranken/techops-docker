'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { UpdateTaskInput } from '../../../validators/update-task.schema';

type DateFieldName = 'scheduleStart' | 'scheduleEnd';

interface EditDateFieldProps {
  name: DateFieldName;
  label: string;
  required?: boolean;
  min?: string;
  register: UseFormRegister<UpdateTaskInput>;
  errors: FieldErrors<UpdateTaskInput>;
}

export function EditDateField({ name, label, required, min, register, errors }: EditDateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasError = !!errors[name];

  function openPicker() {
    inputRef.current?.focus();
    inputRef.current?.showPicker?.();
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        className={cn(
          'h-9 flex items-center gap-2 rounded-md border bg-white dark:bg-slate-800 px-3 cursor-pointer',
          'hover:border-indigo-300 transition-colors',
          hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600',
        )}
        onClick={openPicker}
      >
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          id={name}
          type="date"
          min={min}
          className="flex-1 text-sm bg-transparent outline-none cursor-pointer text-slate-700 dark:text-slate-300 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden"
          {...register(name)}
          ref={(el) => {
            register(name).ref(el);
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }}
        />
      </div>
      {errors[name] && <p className="text-xs text-red-500">{errors[name]?.message}</p>}
    </div>
  );
}
