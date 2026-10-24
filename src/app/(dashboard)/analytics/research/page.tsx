'use client';

/** Báo cáo · Research (V2 A3-5, V1 không có link tới trang này). Bấm việc quá hạn → ngăn xem nhanh dùng chung với Công việc. */
import { Suspense, useState } from 'react';
import { ResearchReport } from '@/modules/analytics/components/report/ResearchReport';
import { TaskDetailDrawer } from '@/modules/tasks/components/TaskDetail/TaskDetailDrawer';

export default function AnalyticsResearchPage() {
  const [open, setOpen] = useState<{ id: string; ids: string[] } | null>(null);
  return (
    <>
      <Suspense fallback={null}>
        <ResearchReport onOpenTask={(id, ids) => setOpen({ id, ids })} />
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
