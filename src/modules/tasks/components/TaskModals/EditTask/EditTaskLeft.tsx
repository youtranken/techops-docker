'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RichTextarea } from '../../CreateTask/RichTextarea';
import { EditForceModeToggle } from './EditForceModeToggle';
import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { UpdateTaskInput } from '../../../validators/update-task.schema';

interface EditTaskLeftProps {
  register: UseFormRegister<UpdateTaskInput>;
  errors: FieldErrors<UpdateTaskInput>;
  setValue: UseFormSetValue<UpdateTaskInput>;
  isForceMode: boolean | undefined;
  isBossOrAdmin: boolean;
  richContent: string;
  onRichContentChange: (html: string) => void;
  serverError: string | null;
}

export function EditTaskLeft({
  register, errors, setValue,
  isForceMode, isBossOrAdmin,
  richContent, onRichContentChange,
  serverError,
}: EditTaskLeftProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!errors.title;

  return (
    <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-slate-700/60 overflow-y-auto px-6 py-5 gap-5">

      {/* Tiêu đề */}
      <div className="space-y-1.5">
        <label htmlFor="edit-title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Tiêu đề <span className="text-red-500">*</span>
        </label>
        <div className={cn(
          'rounded-lg border-2 px-3 py-2.5 transition-all duration-200 bg-white dark:bg-slate-800',
          focused ? 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
            : hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
        )}>
          <input
            id="edit-title"
            placeholder="Nhập tiêu đề công việc..."
            className="w-full text-sm font-medium placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent outline-none text-slate-900 dark:text-slate-100"
            {...register('title', { onBlur: () => setFocused(false) })}
            onFocus={() => setFocused(true)}
          />
        </div>
        {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* Nội dung */}
      <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Nội dung <span className="text-red-500">*</span>
        </label>
        <input type="hidden" {...register('content')} />
        <RichTextarea
          value={richContent}
          onChange={(html) => {
            onRichContentChange(html);
            const text = html.replace(/<[^>]+>/g, '').trim();
            setValue('content', text || '', { shouldValidate: !!errors.content });
          }}
          placeholder="Mô tả chi tiết công việc, yêu cầu, kết quả mong đợi..."
          hasError={!!errors.content}
          className="flex-1 min-h-[160px]"
        />
        {errors.content && <p className="text-xs text-red-500">{errors.content.message}</p>}
      </div>

      {/* Force Mode */}
      {isBossOrAdmin && (
        <EditForceModeToggle checked={isForceMode} onToggle={() => setValue('isForceMode', !isForceMode)} />
      )}

      {serverError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-3 py-2.5">
          <p className="text-xs text-red-600 dark:text-red-400">{serverError}</p>
        </div>
      )}
    </div>
  );
}
