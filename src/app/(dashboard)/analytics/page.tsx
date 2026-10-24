'use client';

/** Báo cáo · Tổng quan (V2 A3-5). Bấm việc trong danh sách sau ô KPI → ngăn xem nhanh dùng chung với Công việc. */
import { Suspense, useState } from 'react';
import { OverviewPage } from '@/modules/analytics/components/report/OverviewPage';
import { TaskDetailDrawer } from '@/modules/tasks/components/TaskDetail/TaskDetailDrawer';

export default function AnalyticsPage() {
  const [open, setOpen] = useState<{ id: string; ids: string[] } | null>(null);
  return (
    <>
      <Suspense fallback={null}>
        <OverviewPage onOpenTask={(id, ids) => setOpen({ id, ids })} />
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
