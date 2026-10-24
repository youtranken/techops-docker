'use client';

/** Báo cáo · Danh sách công việc (V2 A3-5). Bấm dòng → ngăn xem nhanh dùng chung với Công việc. */
import { Suspense, useState } from 'react';
import { TaskListReport } from '@/modules/analytics/components/report/TaskListReport';
import { TaskDetailDrawer } from '@/modules/tasks/components/TaskDetail/TaskDetailDrawer';

export default function AnalyticsTaskListPage() {
  const [open, setOpen] = useState<{ id: string; ids: string[] } | null>(null);
  return (
    <>
      <Suspense fallback={null}>
        <TaskListReport onOpenTask={(id, ids) => setOpen({ id, ids })} />
      </Suspense>
      <TaskDetailDrawer
        taskId={open?.id ?? null}
        ids={open?.ids}
        onNavigate={(id) => setOpen((o) => (o ? { ...o, id } : o))}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
