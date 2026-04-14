'use client';

import type { UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import type { CreateTaskInput } from '../../validators/create-task.schema';
import { InlineSelect, InlineSelectItem } from './InlineSelect';

interface TaskPriority { id: string; name: string; color: string }

interface PrioritySelectProps {
  priorities: TaskPriority[];
  watch: UseFormWatch<CreateTaskInput>;
  setValue: UseFormSetValue<CreateTaskInput>;
  errors: FieldErrors<CreateTaskInput>;
}

export function PrioritySelect({ priorities, watch, setValue, errors }: PrioritySelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">
        Ưu tiên <span className="text-red-500">*</span>
      </label>
      <InlineSelect
        value={watch('priorityId') ?? ''}
        onValueChange={(v) => setValue('priorityId', v, { shouldValidate: true })}
        placeholder="Chọn mức ưu tiên..."
        hasError={!!errors.priorityId}
      >
        {priorities.map((p) => (
          <InlineSelectItem key={p.id} value={p.id}>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
          </InlineSelectItem>
        ))}
      </InlineSelect>
      {errors.priorityId && <p className="text-xs text-red-500">{errors.priorityId.message}</p>}
    </div>
  );
}
