'use client';

import type { UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import type { CreateTaskInput } from '../../validators/create-task.schema';
import { InlineSelect, InlineSelectItem } from './InlineSelect';

interface TaskType { id: string; name: string }

interface TypeSelectProps {
  taskTypes: TaskType[];
  watch: UseFormWatch<CreateTaskInput>;
  setValue: UseFormSetValue<CreateTaskInput>;
  errors: FieldErrors<CreateTaskInput>;
}

export function TypeSelect({ taskTypes, watch, setValue, errors }: TypeSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">
        Loại công việc <span className="text-red-500">*</span>
      </label>
      <InlineSelect
        value={watch('typeId') ?? ''}
        onValueChange={(v) => setValue('typeId', v, { shouldValidate: true })}
        placeholder="Chọn loại..."
        hasError={!!errors.typeId}
      >
        {taskTypes.map((t) => (
          <InlineSelectItem key={t.id} value={t.id}>{t.name}</InlineSelectItem>
        ))}
      </InlineSelect>
      {errors.typeId && <p className="text-xs text-red-500">{errors.typeId.message}</p>}
    </div>
  );
}
