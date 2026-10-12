'use client';

import { ListTodo, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskRowCard, type TaskRowCardProps } from '../TaskCard/TaskRowCard';
import { useTaskPermissions } from '../../actions/hooks/useTaskPermissions';
import { isTrackingRole } from '../../hooks/useTaskTracking';
import type { TaskListItem } from '../../services/task-query.service';

type TaskRowHandlers = Omit<TaskRowCardProps, 'task' | 'permissions' | 'canStar'>;

interface TaskListGridProps extends TaskRowHandlers {
  tasks: TaskListItem[];
  isLoading: boolean;
  isError: boolean;
  currentUserId: string;
  role: string;
  onCreateClick: () => void;
}

function TaskRowCardWrapper({
  task,
  currentUserId,
  role,
  ...props
}: Omit<TaskRowHandlers, never> & { task: TaskListItem; currentUserId: string; role: string }) {
  const permissions = useTaskPermissions(task, currentUserId, role);
  return <TaskRowCard task={task} permissions={permissions} canStar={isTrackingRole(role)} {...props} />;
}

export function TaskListGrid({
  tasks, isLoading, isError, currentUserId, role, onCreateClick, ...handlers
}: TaskListGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Không thể tải danh sách công việc
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <ListTodo className="w-8 h-8 opacity-30" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Không có công việc nào</h3>
            <p className="text-slate-500 max-w-sm mt-1">
              Hiện tại không có công việc nào phù hợp với bộ lọc của bạn.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />Tạo công việc đầu tiên
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {tasks.map((task) => (
        <TaskRowCardWrapper
          key={task.id}
          task={task}
          currentUserId={currentUserId}
          role={role}
          {...handlers}
        />
      ))}
    </div>
  );
}
