'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';
import { EditTaskLeft } from './EditTaskLeft';
import { EditTaskRight } from './EditTaskRight';
import { EditTaskFooter } from './EditTaskFooter';
import { useEditTaskForm } from './useEditTaskForm';
import type { TaskDetail } from '../../../services/task-query.service';

interface EditTaskSheetProps {
  task: TaskDetail;
  open: boolean;
  onClose: () => void;
}

export function EditTaskSheet({ task, open, onClose }: EditTaskSheetProps) {
  const {
    form: { register, formState: { errors }, setValue, watch },
    currentUserId,
    isBossOrAdmin,
    priorities,
    taskTypes,
    serverError,
    richContent,    setRichContent,
    assigneeIds,    setAssigneeIds,
    assigneeTouched,
    lockedIds,
    lockedLabels,
    newFiles,       setNewFiles,
    removedIds,     setRemovedIds,
    isPending,
    handleSubmitClick,
  } = useEditTaskForm(task, onClose);

  const isForceMode   = watch('isForceMode');
  const isImportant   = watch('isImportant');
  const scheduleStart = watch('scheduleStart');

  // Workflow mode editable only for non-boss when task is PENDING_APPROVAL
  const canEditWorkflow = !isBossOrAdmin && task.status === 'PENDING_APPROVAL';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] p-0 flex flex-col bg-white dark:bg-slate-900">

        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <SheetTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-white" />
            </div>
            Chỉnh sửa: <span className="font-mono text-slate-500 dark:text-slate-400 font-medium">{task.title}</span>
          </SheetTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <EditTaskLeft
            register={register}
            errors={errors}
            setValue={setValue}
            isForceMode={isForceMode}
            isImportant={isImportant}
            isBossOrAdmin={isBossOrAdmin}
            richContent={richContent}
            onRichContentChange={setRichContent}
            serverError={serverError}
          />
          <EditTaskRight
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
            taskTypes={taskTypes}
            priorities={priorities}
            assigneeIds={assigneeIds}
            onAssigneeChange={setAssigneeIds}
            currentUserId={currentUserId}
            assigneeTouched={assigneeTouched}
            lockedIds={lockedIds}
            lockedLabels={lockedLabels}
            minEnd={scheduleStart ?? new Date().toISOString().slice(0, 10)}
            canEditWorkflow={canEditWorkflow}
          />
        </div>

        {/* Footer */}
        <EditTaskFooter
          existingFiles={task.attachments}
          removedIds={removedIds}
          newFiles={newFiles}
          onRemoveExisting={(id) => setRemovedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )}
          onNewFilesChange={setNewFiles}
          onCancel={onClose}
          onSubmit={handleSubmitClick}
          isPending={isPending}
        />

      </SheetContent>
    </Sheet>
  );
}
