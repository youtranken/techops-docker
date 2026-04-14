'use client';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useTaskDetail } from '../../hooks/useTaskDetail';
import { EditTaskSheet } from './EditTask/EditTaskSheet';

  interface EditTaskModalProps {
  taskId: string | null;
  onClose: () => void;
}

  export function EditTaskModal({ taskId, onClose }: EditTaskModalProps) {
  const { data: task, isLoading } = useTaskDetail(taskId ?? '');
  const open = Boolean(taskId);

  if (!task) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-[800px] p-0 flex flex-col bg-white">
          <div className="h-14 px-6 border-b border-slate-200 flex items-center shrink-0">
            <SheetTitle className="text-sm font-bold text-slate-500">
              {isLoading ? 'Đang tải...' : 'Không tìm thấy'}
            </SheetTitle>
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            {isLoading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu'}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return <EditTaskSheet key={task.id} task={task} open={open} onClose={onClose} />;
}
