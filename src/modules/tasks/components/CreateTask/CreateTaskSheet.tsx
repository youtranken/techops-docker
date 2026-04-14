'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

import { Plus } from 'lucide-react';
import { CreateTaskLeft } from './CreateTaskLeft';
import { CreateTaskRight } from './CreateTaskRight';
import { CreateTaskFooter } from './CreateTaskFooter';
import { useCreateTaskForm } from './useCreateTaskForm';

interface CreateTaskSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskSheet({ open, onClose }: CreateTaskSheetProps) {
  const {
    form: { register, formState: { errors }, setValue, watch },
    currentUserId,
    isBossOrAdmin,
    priorities,
    taskTypes,
    serverError,
    assigneeIds,   setAssigneeIds,
    assigneeTouched,
    attachments,   setAttachments,
    richContent,   setRichContent,
    isPending,
    handleClose,
    handleSubmitClick,
  } = useCreateTaskForm(onClose);

  const isForceMode   = watch('isForceMode');
  const scheduleStart = watch('scheduleStart');

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] p-0 flex flex-col bg-white dark:bg-slate-900">

        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <SheetTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            Tạo công việc mới
          </SheetTitle>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <CreateTaskLeft
            register={register}
            errors={errors}
            setValue={setValue}
            isForceMode={isForceMode}
            isBossOrAdmin={isBossOrAdmin}
            richContent={richContent}
            onRichContentChange={setRichContent}
            serverError={serverError}
          />
          <CreateTaskRight
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
            minEnd={scheduleStart || new Date().toISOString().slice(0, 10)}
          />
        </div>

        {/* Footer */}
        <CreateTaskFooter
          files={attachments}
          onFilesChange={setAttachments}
          onCancel={handleClose}
          onSubmit={handleSubmitClick}
          isPending={isPending}
        />
      </SheetContent>
    </Sheet>
  );
}
