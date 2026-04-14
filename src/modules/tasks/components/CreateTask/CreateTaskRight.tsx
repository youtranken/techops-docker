'use client';

import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { CreateTaskInput } from '../../validators/create-task.schema';
import { WorkflowModeSelect } from './WorkflowModeSelect';
import { AssigneeSelect } from './AssigneeSelect';
import { TypeSelect } from './TypeSelect';
import { PrioritySelect } from './PrioritySelect';
import { DateField } from './DateField';

interface TaskType     { id: string; name: string }
interface TaskPriority { id: string; name: string; color: string }

interface CreateTaskRightProps {
  register: UseFormRegister<CreateTaskInput>;
  errors: FieldErrors<CreateTaskInput>;
  setValue: UseFormSetValue<CreateTaskInput>;
  watch: UseFormWatch<CreateTaskInput>;
  taskTypes: TaskType[];
  priorities: TaskPriority[];
  assigneeIds: string[];
  onAssigneeChange: (ids: string[]) => void;
  currentUserId: string;
  assigneeTouched: boolean;
  minEnd: string;
}

export function CreateTaskRight({
  register, errors, setValue, watch,
  taskTypes, priorities,
  assigneeIds, onAssigneeChange, currentUserId, assigneeTouched,
  minEnd,
}: CreateTaskRightProps) {
  const workflowMode = watch('workflowMode');

  return (
    <div className="w-[300px] shrink-0 flex flex-col overflow-y-auto bg-slate-50/50 dark:bg-slate-800/40 px-5 py-5 gap-5">

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chế độ xử lý</label>
        <WorkflowModeSelect
          value={workflowMode}
          onChange={(mode) => setValue('workflowMode', mode)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          IT Support <span className="text-red-500">*</span>
        </label>
        <AssigneeSelect
          value={assigneeIds}
          onChange={onAssigneeChange}
          currentUserId={currentUserId}
          touched={assigneeTouched}
        />
      </div>

      <TypeSelect taskTypes={taskTypes} watch={watch} setValue={setValue} errors={errors} />

      <PrioritySelect priorities={priorities} watch={watch} setValue={setValue} errors={errors} />

      <DateField name="scheduleStart" label="Ngày bắt đầu" register={register} errors={errors} />

      <DateField name="scheduleEnd" label="Ngày hoàn thành" required min={minEnd} register={register} errors={errors} />

    </div>
  );
}
