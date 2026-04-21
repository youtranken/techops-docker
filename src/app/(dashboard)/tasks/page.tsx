import { Suspense } from 'react';
import { TaskListClient } from '@/modules/tasks/components/TaskList/TaskListClient';

export const dynamic = 'force-dynamic';

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground text-sm">Đang tải...</div>}>
      <TaskListClient />
    </Suspense>
  );
}
