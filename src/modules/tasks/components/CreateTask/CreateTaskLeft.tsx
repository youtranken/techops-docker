'use client';

import type { UseFormRegister, FieldErrors, UseFormSetValue } from 'react-hook-form';
import type { CreateTaskInput } from '../../validators/create-task.schema';
import { TitleInput } from './TitleInput';
import { RichTextarea } from './RichTextarea';
import { ForceModeToggle } from './ForceModeToggle';
import { ImportantToggle } from './ImportantToggle';
import { FieldError } from './FieldError';

interface CreateTaskLeftProps {
  register: UseFormRegister<CreateTaskInput>;
  errors: FieldErrors<CreateTaskInput>;
  setValue: UseFormSetValue<CreateTaskInput>;
  isForceMode: boolean;
  isImportant: boolean;
  isBossOrAdmin: boolean;
  richContent: string;
  onRichContentChange: (html: string) => void;
  serverError: string | null;
}

export function CreateTaskLeft({
  register,
  errors,
  setValue,
  isForceMode,
  isImportant,
  isBossOrAdmin,
  richContent,
  onRichContentChange,
  serverError,
}: CreateTaskLeftProps) {
  return (
    <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-slate-700/60 overflow-y-auto px-6 py-5 gap-5">
      {/* Tiêu đề */}
      <TitleInput register={register} errors={errors} />

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
        <FieldError message={errors.content?.message} />
      </div>

      {/* ★ Quan trọng — chỉ Boss/Admin */}
      {isBossOrAdmin && (
        <ImportantToggle checked={isImportant} onCheckedChange={(v) => setValue('isImportant', v)} />
      )}

      {/* Force Mode */}
      {isBossOrAdmin && (
        <ForceModeToggle
          checked={isForceMode}
          onCheckedChange={(v) => setValue('isForceMode', v)}
        />
      )}

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-3 py-2.5">
          <p className="text-xs text-red-600 dark:text-red-400">{serverError}</p>
        </div>
      )}
    </div>
  );
}
