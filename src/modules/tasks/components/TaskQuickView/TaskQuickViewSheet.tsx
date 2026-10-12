'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { QuickViewHeader } from './QuickViewHeader';
import { QuickViewHero } from './QuickViewHero';
import { QuickViewMeta } from './QuickViewMeta';
import { QuickViewTimeline } from './QuickViewTimeline';
import { QuickViewAssignees } from './QuickViewAssignees';
import { QuickViewComments } from './QuickViewComments';
import { QuickViewActions } from './QuickViewActions';
import { QuickViewLoading, QuickViewError } from './QuickViewSkeleton';
import { useQuickViewData } from './useQuickViewData';
import { useMarkSeenOnOpen } from '../../hooks/useTaskTracking';

interface TaskQuickViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  currentUserId: string;
  role: string;
}

export function TaskQuickViewSheet({
  open, onOpenChange, taskId, currentUserId, role,
}: TaskQuickViewSheetProps) {
  const { task, isLoading, isError, permissions, currentAssigneeIds } =
    useQuickViewData(taskId, currentUserId, role);

  // V2: Boss/Admin mở xem nhanh task Hoàn thành → tính là đã xem
  useMarkSeenOnOpen(open ? task : null, role);

  function handleClose() { onOpenChange(false); }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] p-0 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">

        <QuickViewHeader taskId={taskId} hasTask={!!task} onClose={handleClose} />

        {isLoading ? <QuickViewLoading /> : (isError || !task) ? <QuickViewError /> : (
          <>
            {/* Scroll body */}
            <div className="flex-1 min-h-0 overflow-y-auto">

              <QuickViewHero task={task} />

              <div className="px-5 pb-5 pt-3 space-y-4">
                <QuickViewMeta task={task} />
                <QuickViewTimeline task={task} />
                <QuickViewAssignees assignees={task.assignees} />
                <QuickViewComments
                  taskId={task.id}
                  currentUserId={currentUserId}
                  isAdmin={permissions.isAdmin}
                  canComment={!['COMPLETED', 'CANCELLED'].includes(task.status)}
                />
              </div>

            </div>

            {/* Footer cố định — Actions */}
            <QuickViewActions
              task={task}
              permissions={permissions}
              currentAssigneeIds={currentAssigneeIds}
              currentUserId={currentUserId}
            />
          </>
        )}

      </SheetContent>
    </Sheet>
  );
}
