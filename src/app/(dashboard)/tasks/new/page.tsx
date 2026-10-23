import { Suspense } from 'react';
import { TaskFormPage } from '@/modules/tasks/components/TaskForm/TaskFormPage';

/** V2 A2-4b: trang đầy đủ "Tạo công việc" (?draft=<id> mở nháp lưu trên trình duyệt · ?from=panel từ ngăn trượt). */
export default function NewTaskPage() {
  return (
    <Suspense fallback={null}>
      <TaskFormPage />
    </Suspense>
  );
}
