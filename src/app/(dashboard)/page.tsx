'use client';

/** Tổng quan (V2 A3-1). Bấm việc ở các khối → ngăn xem nhanh dùng chung với Công việc (‹ › theo thứ tự trong khối). */
import { useState } from 'react';
import { DashboardSection } from '@/modules/dashboard/sections/DashboardSection';
import { TaskDetailDrawer } from '@/modules/tasks/components/TaskDetail/TaskDetailDrawer';

export default function DashboardPage() {
  const [open, setOpen] = useState<{ id: string; ids: string[] } | null>(null);
  return (
    <>
      <DashboardSection onOpenTask={(id, ids) => setOpen({ id, ids })} />
      <TaskDetailDrawer
        taskId={open?.id ?? null}
        ids={open?.ids}
        onNavigate={(id) => setOpen((o) => (o ? { ...o, id } : o))}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
