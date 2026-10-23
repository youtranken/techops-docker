import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { TaskListClient } from '@/modules/tasks/components/TaskList/TaskListClient';
import { VIEW_COOKIE } from '@/modules/tasks/components/TaskList/board-logic';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  // Chế độ xem đã nhớ (Danh sách | Bảng) — URL `mode` vẫn thắng (TaskListClient)
  const remembered = (await cookies()).get(VIEW_COOKIE)?.value;
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted-foreground text-sm">Đang tải...</div>}>
      <TaskListClient rememberedMode={remembered} />
    </Suspense>
  );
}
