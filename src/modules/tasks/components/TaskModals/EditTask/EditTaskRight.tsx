'use client';

import type { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { WorkflowModeSelect } from '../../CreateTask/WorkflowModeSelect';
import { InlineSelect, InlineSelectItem } from '../../CreateTask/InlineSelect';
import { EditDateField } from './EditDateField';
import { EditTaskAssigneeSelect } from './EditTaskAssigneeSelect';
import type { UpdateTaskInput } from '../../../validators/update-task.schema';

interface TaskType     { id: string; name: string }
interface TaskPriority { id: string; name: string; color: string }

interface EditTaskRightProps {
  register: UseFormRegister<UpdateTaskInput>;
  errors: FieldErrors<UpdateTaskInput>;
  setValue: UseFormSetValue<UpdateTaskInput>;
  watch: UseFormWatch<UpdateTaskInput>;
  taskTypes: TaskType[];
  priorities: TaskPriority[];
  assigneeIds: string[];
  onAssigneeChange: (ids: string[]) => void;
  currentUserId: string;
  assigneeTouched: boolean;
  lockedIds: string[];
  lockedLabels: Record<string, string>;
  minEnd: string;
  canEditWorkflow: boolean;
}

export function EditTaskRight({
  register, errors, setValue, watch,
  taskTypes, priorities,
  assigneeIds, onAssigneeChange, currentUserId, assigneeTouched,
  lockedIds, lockedLabels, minEnd, canEditWorkflow,
}: EditTaskRightProps) {
  const workflowMode = watch('workflowMode') ?? 'IMMEDIATE';

  return (
    <div className="w-[300px] shrink-0 flex flex-col overflow-y-auto bg-slate-50/50 dark:bg-slate-800/40 px-5 py-5 gap-5">

      {/* Chế độ xử lý — chỉ hiện với user không phải boss/admin và status PENDING_APPROVAL */}
      {canEditWorkflow && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chế độ xử lý</label>
          <WorkflowModeSelect
            value={workflowMode as 'IMMEDIATE' | 'NEED_APPROVAL'}
            onChange={(mode) => setValue('workflowMode', mode)}
          />
        </div>
      )}

      {/* IT Support */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          IT Support <span className="text-red-500">*</span>
        </label>
        <EditTaskAssigneeSelect
          value={assigneeIds}
          onChange={onAssigneeChange}
          lockedIds={lockedIds}
          lockedLabels={lockedLabels}
          currentUserId={currentUserId}
          touched={assigneeTouched}
        />
      </div>

      {/* Loại công việc */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Loại công việc <span className="text-red-500">*</span>
        </label>
        <InlineSelect value={watch('typeId') ?? ''} onValueChange={(v) => setValue('typeId', v, { shouldValidate: true })} placeholder="Chọn loại..." hasError={!!errors.typeId}>
          {taskTypes.map((t) => <InlineSelectItem key={t.id} value={t.id}>{t.name}</InlineSelectItem>)}
        </InlineSelect>
        {errors.typeId && <p className="text-xs text-red-500">{errors.typeId.message}</p>}
      </div>

      {/* Ưu tiên */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Ưu tiên <span className="text-red-500">*</span>
        </label>
        <InlineSelect value={watch('priorityId') ?? ''} onValueChange={(v) => setValue('priorityId', v, { shouldValidate: true })} placeholder="Chọn mức ưu tiên..." hasError={!!errors.priorityId}>
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

      {/* Ngày */}
      <EditDateField name="scheduleStart" label="Ngày bắt đầu" register={register} errors={errors} />
      <EditDateField name="scheduleEnd" label="Ngày hoàn thành" required min={minEnd} register={register} errors={errors} />
    </div>
  );
}
